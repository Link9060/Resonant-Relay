import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const PROD_ORIGIN = 'https://resonantrelay.org';
const BETA_ORIGIN = 'https://link9060.github.io';
const LOCAL_ORIGIN = 'http://localhost:3000';
const ALLOWED_ORIGINS = new Set([PROD_ORIGIN, BETA_ORIGIN, LOCAL_ORIGIN]);
const MAX_REPLIES_PER_MINUTE = 10;
const MAX_REPLIES_PER_DAY = 100;

function cors(req: Request) {
  const origin = req.headers.get('Origin');
  return {
    ...(origin && ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(req: Request, value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...cors(req), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(req, { error: 'Not signed in.' }, 401);

  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });

  try {
    const { data: { user }, error: userError } = await client.auth.getUser(token);
    if (userError || !user) return json(req, { error: 'Not signed in.' }, 401);

    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !['admin', 'owner'].includes(profile.role)) {
      return json(req, { error: 'Admin or Owner access is required.' }, 403);
    }

    const body = await req.json();
    if (body?.action !== 'reply') return json(req, { error: 'Unknown action.' }, 400);

    const threadId = typeof body.threadId === 'string' ? body.threadId : '';
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!threadId) return json(req, { error: 'Thread is required.' }, 400);
    if (!text || text.length > 10000) return json(req, { error: 'Reply must be between 1 and 10,000 characters.' }, 400);

    const nowMs = Date.now();
    const minuteAgo = new Date(nowMs - 60_000).toISOString();
    const dayAgo = new Date(nowMs - 24 * 60 * 60_000).toISOString();
    const [minuteCount, dayCount] = await Promise.all([
      admin.from('support_email_messages').select('id', { count: 'exact', head: true }).eq('direction', 'outbound').eq('sent_by', user.id).gte('created_at', minuteAgo),
      admin.from('support_email_messages').select('id', { count: 'exact', head: true }).eq('direction', 'outbound').eq('sent_by', user.id).gte('created_at', dayAgo),
    ]);
    if (minuteCount.error) throw minuteCount.error;
    if (dayCount.error) throw dayCount.error;
    if ((minuteCount.count ?? 0) >= MAX_REPLIES_PER_MINUTE) {
      return json(req, { error: 'Support reply rate limit reached. Wait a minute and try again.' }, 429);
    }
    if ((dayCount.count ?? 0) >= MAX_REPLIES_PER_DAY) {
      return json(req, { error: 'Daily support reply limit reached.' }, 429);
    }

    const { data: config, error: configError } = await admin
      .from('support_email_config')
      .select('resend_api_key,support_address')
      .eq('id', 1)
      .single();
    if (configError || !config) throw configError ?? new Error('Support email config missing');

    const { data: thread, error: threadError } = await admin
      .from('support_email_threads')
      .select('id,sender_email,sender_name,subject,status')
      .eq('id', threadId)
      .single();
    if (threadError || !thread) return json(req, { error: 'Support thread not found.' }, 404);

    const { data: messages, error: messagesError } = await admin
      .from('support_email_messages')
      .select('message_id,created_at')
      .eq('thread_id', threadId)
      .not('message_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(50);
    if (messagesError) throw messagesError;

    const messageIds = (messages ?? []).map((message: any) => message.message_id).filter(Boolean);
    const lastMessageId = messageIds[messageIds.length - 1] ?? null;
    const subject = /^re:/i.test(thread.subject) ? thread.subject : `Re: ${thread.subject}`;
    const headers: Record<string, string> = {};
    if (lastMessageId) headers['In-Reply-To'] = lastMessageId;
    if (messageIds.length) headers['References'] = messageIds.join(' ');

    const sendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resend_api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Relay Support <${config.support_address}>`,
        to: [thread.sender_email],
        subject,
        text,
        headers,
      }),
    });

    if (!sendResponse.ok) {
      const detail = await sendResponse.text();
      console.error('Resend send failed', sendResponse.status, detail);
      return json(req, { error: 'Relay could not send the support reply.' }, 502);
    }

    const sent = await sendResponse.json();
    const sentId = sent?.id ?? null;
    let sentMessageId: string | null = null;
    if (sentId) {
      const lookup = await fetch(`https://api.resend.com/emails/${encodeURIComponent(sentId)}`, {
        headers: { Authorization: `Bearer ${config.resend_api_key}` },
      });
      if (lookup.ok) {
        const detail = await lookup.json();
        sentMessageId = detail?.message_id ?? null;
      }
    }

    const now = new Date().toISOString();
    const { error: insertError } = await admin.from('support_email_messages').insert({
      thread_id: threadId,
      direction: 'outbound',
      resend_email_id: sentId,
      message_id: sentMessageId,
      in_reply_to: lastMessageId,
      from_email: config.support_address,
      to_emails: [thread.sender_email],
      subject,
      text_body: text,
      headers,
      sent_by: user.id,
      created_at: now,
    });
    if (insertError) throw insertError;

    await admin.from('support_email_threads').update({
      status: 'pending',
      latest_message_at: now,
      updated_at: now,
    }).eq('id', threadId);

    await admin.from('admin_audit_log').insert({
      actor_id: user.id,
      action: 'support_email_reply',
      metadata: { thread_id: threadId, recipient: thread.sender_email, resend_email_id: sentId },
    });

    return json(req, { ok: true, emailId: sentId });
  } catch (error) {
    console.error(error);
    return json(req, { error: 'Relay could not complete that support email action.' }, 500);
  }
});
