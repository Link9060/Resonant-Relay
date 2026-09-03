import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Provider = 'google' | 'microsoft';
const APP_ORIGIN = 'https://link9060.github.io';
const APP_URL = `${APP_ORIGIN}/Resonant-Relay`;
const ALLOWED_ORIGINS = new Set([APP_ORIGIN, 'http://localhost:3000']);
const GOOGLE_SCOPE = 'openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events.readonly';
const MICROSOFT_SCOPE = 'openid profile email offline_access User.Read Mail.Read Calendars.Read';

function cors(req: Request) {
  const origin = req.headers.get('Origin');
  return { ...(origin && ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}), 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
}
function json(req: Request, value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: { ...cors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }); }
function redirect(provider: Provider, result: 'connected' | 'error', reason?: string, returnPath = '/email') { const safePath = returnPath === '/calendar' ? '/calendar/' : '/email/'; const url = new URL(`${APP_URL}${safePath}`); url.searchParams.set(provider, result); if (reason) url.searchParams.set('reason', reason); return new Response(null, { status: 302, headers: { Location: url.toString(), 'Cache-Control': 'no-store' } }); }
function base64url(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function randomValue(size = 32) { return base64url(crypto.getRandomValues(new Uint8Array(size))); }
async function sha256(value: string) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))); }
async function hashHex(value: string) { return Array.from(await sha256(value), (byte) => byte.toString(16).padStart(2, '0')).join(''); }
function providerOf(value: unknown): Provider | null { return value === 'google' || value === 'microsoft' ? value : null; }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
  const requestUrl = new URL(req.url);
  try {
    if (req.method === 'GET' && requestUrl.pathname.endsWith('/callback')) return await callback(requestUrl, admin, supabaseUrl);
    if (req.method !== 'POST') return json(req, { error: 'Method not allowed.' }, 405);
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json(req, { error: 'Not signed in.' }, 401);
    const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error } = await client.auth.getUser(token);
    if (error || !user) return json(req, { error: 'Not signed in.' }, 401);
    const body = await req.json();

    if (body.action === 'accounts') {
      const { data } = await admin.from('email_integrations').select('id,provider,email_address,display_name,connected_at,granted_scope').eq('user_id', user.id).order('connected_at');
      return json(req, { accounts: data ?? [] });
    }
    if (body.action === 'connect_start') {
      const provider = providerOf(body.provider);
      if (!provider) return json(req, { error: 'Choose Google or Microsoft.' }, 400);
      const { count } = await admin.from('email_integrations').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
      if ((count ?? 0) >= 3) return json(req, { error: 'Relay supports up to three email accounts.' }, 409);
      if (!configured(provider)) return json(req, { error: `${provider === 'google' ? 'Google' : 'Microsoft'} OAuth is not configured yet.` }, 503);
      const state = randomValue();
      const verifier = randomValue(64);
      await admin.from('email_oauth_states').delete().lt('expires_at', new Date().toISOString());
      const returnPath = body.next === '/calendar' ? '/calendar' : '/email';
      const { error: stateError } = await admin.from('email_oauth_states').insert({ state_hash: await hashHex(state), user_id: user.id, provider, code_verifier: verifier, return_path: returnPath, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
      if (stateError) throw stateError;
      const callbackUrl = `${supabaseUrl}/functions/v1/mail-hub/callback`;
      const challenge = base64url(await sha256(verifier));
      const authUrl = provider === 'google' ? new URL('https://accounts.google.com/o/oauth2/v2/auth') : new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
      authUrl.search = new URLSearchParams({ client_id: clientId(provider), redirect_uri: callbackUrl, response_type: 'code', scope: provider === 'google' ? GOOGLE_SCOPE : MICROSOFT_SCOPE, state, code_challenge: challenge, code_challenge_method: 'S256', ...(provider === 'google' ? { access_type: 'offline', prompt: 'consent select_account' } : { response_mode: 'query', prompt: 'select_account' }) }).toString();
      return json(req, { url: authUrl.toString() });
    }
    if (body.action === 'disconnect') {
      const { data: account } = await admin.from('email_integrations').select('*').eq('id', body.accountId).eq('user_id', user.id).maybeSingle();
      if (!account) return json(req, { error: 'Email account not found.' }, 404);
      await admin.from('email_integrations').delete().eq('id', account.id).eq('user_id', user.id);
      if (account.provider === 'google') await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(account.refresh_token)}`, { method: 'POST' }).catch(() => undefined);
      return json(req, { ok: true });
    }
    if (body.action === 'messages') {
      const { data: accounts } = await admin.from('email_integrations').select('*').eq('user_id', user.id).order('connected_at');
      const groups = await Promise.all((accounts ?? []).map(async (account: any) => {
        try {
          const token = await accessToken(admin, account);
          if (!token) return [];
          if (account.provider_account_id.startsWith('legacy:')) {
            const identity = await identityFor('google', token);
            await admin.from('email_integrations').update({ provider_account_id: identity.id, email_address: identity.email, display_name: identity.name }).eq('id', account.id);
            account.provider_account_id = identity.id; account.email_address = identity.email; account.display_name = identity.name;
          }
          return await messagesFor(account, token);
        }
        catch (error) { console.error(error); return []; }
      }));
      return json(req, { messages: groups.flat().sort((a, b) => new Date(b.receivedAt ?? 0).getTime() - new Date(a.receivedAt ?? 0).getTime()).slice(0, 30) });
    }
    if (body.action === 'calendar_events') {
      const { data: accounts } = await admin.from('email_integrations').select('*').eq('user_id', user.id).order('connected_at');
      const results = await Promise.all((accounts ?? []).map(async (account: any) => {
        try { const token = await accessToken(admin, account); if (!token) return { events: [], error: account.email_address }; return { events: await eventsFor(account, token), error: null }; }
        catch (error) { console.error(error); return { events: [], error: account.email_address }; }
      }));
      return json(req, { events: results.flatMap((result) => result.events).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(0, 60), accountErrors: results.map((result) => result.error).filter(Boolean) });
    }
    return json(req, { error: 'Unknown action.' }, 400);
  } catch (error) { console.error(error); return json(req, { error: 'Relay could not complete that email request.' }, 500); }
});

function clientId(provider: Provider) { return Deno.env.get(provider === 'google' ? 'GOOGLE_OAUTH_CLIENT_ID' : 'MICROSOFT_OAUTH_CLIENT_ID') ?? ''; }
function clientSecret(provider: Provider) { return Deno.env.get(provider === 'google' ? 'GOOGLE_OAUTH_CLIENT_SECRET' : 'MICROSOFT_OAUTH_CLIENT_SECRET') ?? ''; }
function configured(provider: Provider) { return Boolean(clientId(provider) && clientSecret(provider)); }

async function callback(url: URL, admin: any, supabaseUrl: string) {
  const rawState = url.searchParams.get('state'); const code = url.searchParams.get('code');
  if (!rawState || !code) return redirect('google', 'error', 'missing_response');
  const { data: state } = await admin.from('email_oauth_states').select('*').eq('state_hash', await hashHex(rawState)).maybeSingle();
  if (!state) return redirect('google', 'error', 'invalid_state');
  await admin.from('email_oauth_states').delete().eq('state_hash', state.state_hash);
  const provider = state.provider as Provider;
  if (new Date(state.expires_at).getTime() <= Date.now()) return redirect(provider, 'error', 'expired', state.return_path);
  if (!configured(provider)) return redirect(provider, 'error', 'not_configured', state.return_path);
  const callbackUrl = `${supabaseUrl}/functions/v1/mail-hub/callback`;
  const tokenUrl = provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  const tokenResponse = await fetch(tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId(provider), client_secret: clientSecret(provider), code, code_verifier: state.code_verifier, grant_type: 'authorization_code', redirect_uri: callbackUrl, ...(provider === 'microsoft' ? { scope: MICROSOFT_SCOPE } : {}) }) });
  if (!tokenResponse.ok) return redirect(provider, 'error', 'token_exchange', state.return_path);
  const tokens = await tokenResponse.json();
  if (!tokens.refresh_token) return redirect(provider, 'error', 'missing_refresh_token', state.return_path);
  const identity = await identityFor(provider, tokens.access_token);
  const { error } = await admin.from('email_integrations').upsert({ user_id: state.user_id, provider, provider_account_id: identity.id, email_address: identity.email, display_name: identity.name, refresh_token: tokens.refresh_token, access_token: tokens.access_token, access_token_expires_at: new Date(Date.now() + Number(tokens.expires_in ?? 3600) * 1000).toISOString(), granted_scope: tokens.scope ?? (provider === 'google' ? GOOGLE_SCOPE : MICROSOFT_SCOPE), connected_at: new Date().toISOString() }, { onConflict: 'user_id,provider,provider_account_id' });
  if (error) return redirect(provider, 'error', error.message.includes('three') ? 'account_limit' : 'save_failed', state.return_path);
  return redirect(provider, 'connected', undefined, state.return_path);
}

async function identityFor(provider: Provider, token: string) {
  const response = await fetch(provider === 'google' ? 'https://openidconnect.googleapis.com/v1/userinfo' : 'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error('Could not load email identity.');
  const value = await response.json();
  return provider === 'google' ? { id: value.sub, email: value.email, name: value.name ?? value.email } : { id: value.id, email: value.mail ?? value.userPrincipalName, name: value.displayName ?? value.mail };
}

async function accessToken(admin: any, account: any) {
  if (account.access_token && account.access_token_expires_at && new Date(account.access_token_expires_at).getTime() > Date.now() + 60_000) return account.access_token;
  const provider = account.provider as Provider;
  const response = await fetch(provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://login.microsoftonline.com/common/oauth2/v2.0/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId(provider), client_secret: clientSecret(provider), refresh_token: account.refresh_token, grant_type: 'refresh_token', ...(provider === 'microsoft' ? { scope: account.granted_scope || MICROSOFT_SCOPE } : {}) }) });
  if (!response.ok) { if (response.status === 400) await admin.from('email_integrations').delete().eq('id', account.id); return null; }
  const value = await response.json();
  await admin.from('email_integrations').update({ access_token: value.access_token, access_token_expires_at: new Date(Date.now() + Number(value.expires_in ?? 3600) * 1000).toISOString(), ...(value.refresh_token ? { refresh_token: value.refresh_token } : {}) }).eq('id', account.id);
  return value.access_token as string;
}

async function messagesFor(account: any, token: string) {
  if (account.provider === 'microsoft') {
    const query = new URLSearchParams({ '$top': '15', '$select': 'id,subject,from,receivedDateTime,isRead,bodyPreview,webLink', '$orderby': 'receivedDateTime desc' });
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?${query}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(`Microsoft mail error (${response.status}).`);
    const data = await response.json();
    return (data.value ?? []).map((message: any) => ({ id: `${account.id}:${message.id}`, subject: message.subject || '(No subject)', from: message.from?.emailAddress?.name || message.from?.emailAddress?.address || '', snippet: message.bodyPreview ?? '', receivedAt: message.receivedDateTime, isUnread: !message.isRead, href: message.webLink ?? null, accountId: account.id, accountEmail: account.email_address, provider: account.provider }));
  }
  const listResponse = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=15&labelIds=INBOX', { headers: { Authorization: `Bearer ${token}` } });
  if (!listResponse.ok) throw new Error(`Gmail error (${listResponse.status}).`);
  const list = await listResponse.json();
  return (await Promise.all((list.messages ?? []).map(async (message: any) => {
    const query = new URLSearchParams({ format: 'metadata' }); ['Subject','From','Date'].forEach((name) => query.append('metadataHeaders', name));
    const response = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${message.id}?${query}`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) return null;
    const data = await response.json(); const header = (name: string) => data.payload.headers.find((item: any) => item.name === name)?.value ?? '';
    return { id: `${account.id}:${data.id}`, subject: header('Subject') || '(No subject)', from: header('From'), snippet: data.snippet ?? '', receivedAt: header('Date') || null, isUnread: data.labelIds?.includes('UNREAD') ?? false, href: `https://mail.google.com/mail/u/${encodeURIComponent(account.email_address)}/#inbox/${data.id}`, accountId: account.id, accountEmail: account.email_address, provider: account.provider };
  }))).filter(Boolean);
}

async function eventsFor(account: any, token: string) {
  const timeMin = new Date().toISOString();
  const timeMax = new Date(Date.now() + 90 * 24 * 60 * 60_000).toISOString();
  if (account.provider === 'microsoft') {
    const query = new URLSearchParams({ startDateTime: timeMin, endDateTime: timeMax, '$top': '30', '$orderby': 'start/dateTime', '$select': 'id,subject,start,end,isAllDay,webLink' });
    const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendarView?${query}`, { headers: { Authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' } });
    if (!response.ok) throw new Error(`Microsoft calendar error (${response.status}).`);
    const data = await response.json();
    return (data.value ?? []).map((event: any) => ({ id: `${account.id}:${event.id}`, summary: event.subject || '(Untitled event)', start: event.start?.dateTime, end: event.end?.dateTime, isAllDay: Boolean(event.isAllDay), htmlLink: event.webLink ?? null, accountId: account.id, accountEmail: account.email_address, provider: account.provider }));
  }
  const query = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', timeMin, timeMax, maxResults: '30' });
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${query}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Google calendar error (${response.status}).`);
  const data = await response.json();
  return (data.items ?? []).map((event: any) => ({ id: `${account.id}:${event.id}`, summary: event.summary || '(Untitled event)', start: event.start?.dateTime ?? event.start?.date, end: event.end?.dateTime ?? event.end?.date, isAllDay: Boolean(event.start?.date), htmlLink: event.htmlLink ?? null, accountId: account.id, accountEmail: account.email_address, provider: account.provider }));
}
