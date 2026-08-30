import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

type GoogleService = 'calendar' | 'gmail';

const APP_ORIGIN = 'https://link9060.github.io';
const APP_BASE_URL = `${APP_ORIGIN}/Resonant-Relay`;
const ALLOWED_ORIGINS = new Set([APP_ORIGIN, 'http://localhost:3000']);
const GOOGLE_SCOPES: Record<GoogleService, string> = {
  calendar: 'https://www.googleapis.com/auth/calendar.events.readonly',
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
};

function corsHeaders(req: Request) {
  const origin = req.headers.get('Origin');
  return {
    ...(origin && ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function redirect(path: string, result: 'connected' | 'error', detail?: string) {
  const url = new URL(`${APP_BASE_URL}${path}/`);
  url.searchParams.set('google', result);
  if (detail) url.searchParams.set('reason', detail);
  return new Response(null, { status: 302, headers: { Location: url.toString(), 'Cache-Control': 'no-store' } });
}

function parseService(value: unknown): GoogleService | null {
  return value === 'calendar' || value === 'gmail' ? value : null;
}

function expectedReturnTo(service: GoogleService) {
  return service === 'gmail' ? '/email' : '/calendar';
}

function randomState() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hashState(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const requestUrl = new URL(req.url);

  try {
    if (req.method === 'GET' && requestUrl.pathname.endsWith('/callback')) {
      return await handleCallback(requestUrl, admin, supabaseUrl);
    }

    if (req.method !== 'POST') return json(req, { error: 'Method not allowed.' }, 405);

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) return json(req, { error: 'Not signed in.' }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) return json(req, { error: 'Not signed in.' }, 401);

    const body = await req.json();
    const service = parseService(body.service);
    if (!service) return json(req, { error: 'Invalid Google service.' }, 400);

    if (body.action === 'connect_start') {
      const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
      if (!clientId || !clientSecret) return json(req, { error: 'Google connection is not configured yet.' }, 503);

      const state = randomState();
      const stateHash = await hashState(state);
      const returnTo = expectedReturnTo(service);
      await admin.from('google_oauth_states').delete().lt('expires_at', new Date().toISOString());
      const { error } = await admin.from('google_oauth_states').insert({
        state_hash: stateHash,
        user_id: user.id,
        service,
        return_to: returnTo,
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
      if (error) throw error;

      const redirectUri = `${supabaseUrl}/functions/v1/google-hub/callback`;
      const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: `openid email profile ${GOOGLE_SCOPES[service]}`,
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
        state,
      }).toString();
      return json(req, { url: authorizationUrl.toString() });
    }

    if (body.action === 'status') {
      const { data } = await admin.from('google_integrations').select('connected_at').eq('user_id', user.id).eq('service', service).maybeSingle();
      return json(req, { connected: !!data, connectedAt: data?.connected_at ?? null });
    }

    if (body.action === 'disconnect') {
      const { data } = await admin.from('google_integrations').select('refresh_token').eq('user_id', user.id).eq('service', service).maybeSingle();
      await admin.from('google_integrations').delete().eq('user_id', user.id).eq('service', service);
      const { count } = await admin.from('google_integrations').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      if (count === 0 && data?.refresh_token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(data.refresh_token)}`, { method: 'POST' }).catch(() => undefined);
      }
      return json(req, { ok: true });
    }

    const accessToken = await getAccessToken(admin, user.id, service);
    if (!accessToken) return json(req, { error: 'Not connected.' }, 409);
    if (body.action === 'calendar_events') return json(req, { events: await calendarEvents(accessToken) });
    if (body.action === 'gmail_messages') return json(req, { messages: await gmailMessages(accessToken) });
    return json(req, { error: 'Unknown action.' }, 400);
  } catch (error) {
    console.error(error);
    return json(req, { error: 'Relay could not complete that Google request.' }, 500);
  }
});

async function handleCallback(requestUrl: URL, admin: any, supabaseUrl: string) {
  const rawState = requestUrl.searchParams.get('state');
  const code = requestUrl.searchParams.get('code');
  if (!rawState || !code) return redirect('/calendar', 'error', 'missing_response');

  const stateHash = await hashState(rawState);
  const { data: state } = await admin.from('google_oauth_states').select('*').eq('state_hash', stateHash).maybeSingle();
  if (!state) return redirect('/calendar', 'error', 'invalid_state');
  await admin.from('google_oauth_states').delete().eq('state_hash', stateHash);
  if (new Date(state.expires_at).getTime() <= Date.now()) return redirect(state.return_to, 'error', 'expired');

  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
  if (!clientId || !clientSecret) return redirect(state.return_to, 'error', 'not_configured');

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: `${supabaseUrl}/functions/v1/google-hub/callback`,
    }),
  });
  if (!tokenResponse.ok) return redirect(state.return_to, 'error', 'token_exchange');

  const tokens = await tokenResponse.json();
  if (!tokens.refresh_token) return redirect(state.return_to, 'error', 'missing_refresh_token');
  const { error } = await admin.from('google_integrations').upsert({
    user_id: state.user_id,
    service: state.service,
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token ?? null,
    access_token_expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
    granted_scope: tokens.scope ?? GOOGLE_SCOPES[state.service as GoogleService],
    connected_at: new Date().toISOString(),
  }, { onConflict: 'user_id,service' });
  if (error) throw error;
  return redirect(state.return_to, 'connected');
}

async function getAccessToken(admin: any, userId: string, service: GoogleService) {
  const { data } = await admin.from('google_integrations').select('refresh_token,access_token,access_token_expires_at').eq('user_id', userId).eq('service', service).maybeSingle();
  if (!data) return null;
  if (data.access_token && data.access_token_expires_at && new Date(data.access_token_expires_at).getTime() > Date.now() + 60_000) return data.access_token;

  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Google secrets missing.');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: data.refresh_token, grant_type: 'refresh_token' }),
  });
  if (!response.ok) {
    if (response.status === 400) await admin.from('google_integrations').delete().eq('user_id', userId).eq('service', service);
    return null;
  }
  const refreshed = await response.json();
  await admin.from('google_integrations').update({
    access_token: refreshed.access_token,
    access_token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
  }).eq('user_id', userId).eq('service', service);
  return refreshed.access_token as string;
}

async function calendarEvents(token: string) {
  const query = new URLSearchParams({ timeMin: new Date().toISOString(), maxResults: '10', singleEvents: 'true', orderBy: 'startTime' });
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${query}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Google Calendar error (${response.status}).`);
  const data = await response.json();
  return (data.items ?? []).map((event: any) => ({ id: event.id, summary: event.summary ?? '(No title)', start: event.start.dateTime ?? event.start.date ?? '', end: event.end.dateTime ?? event.end.date ?? '', isAllDay: !event.start.dateTime, htmlLink: event.htmlLink }));
}

async function gmailMessages(token: string) {
  const listResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=15&labelIds=INBOX', { headers: { Authorization: `Bearer ${token}` } });
  if (!listResponse.ok) throw new Error(`Gmail error (${listResponse.status}).`);
  const list = await listResponse.json();
  const messages = await Promise.all((list.messages ?? []).map(async (message: any) => {
    const query = new URLSearchParams({ format: 'metadata' });
    ['Subject', 'From', 'Date'].forEach((header) => query.append('metadataHeaders', header));
    const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?${query}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return null;
    const data = await response.json();
    const header = (name: string) => data.payload.headers.find((item: any) => item.name === name)?.value ?? '';
    return { id: data.id, subject: header('Subject') || '(No subject)', from: header('From'), snippet: data.snippet, receivedAt: header('Date') || null, isUnread: data.labelIds?.includes('UNREAD') ?? false };
  }));
  return messages.filter(Boolean);
}
