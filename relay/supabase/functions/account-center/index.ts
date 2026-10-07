import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://resonantrelay.org',
  'https://www.resonantrelay.org',
  'https://enterarrow.com',
  'https://www.enterarrow.com',
  'https://link9060.github.io',
  'http://localhost:3000',
]);

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
  const { data: { user }, error: userError } = await client.auth.getUser(token);
  if (userError || !user) return json(req, { error: 'Not signed in.' }, 401);

  try {
    const body = await req.json();

    if (body.action === 'unsend_message') {
      const { data: message } = await admin.from('messages').select('id,conversation_id,sender_id,created_at,attachments').eq('id', body.messageId).maybeSingle();
      if (!message || message.sender_id !== user.id) return json(req, { error: 'Message not found.' }, 404);
      if (Date.now() - new Date(message.created_at).getTime() > 2 * 60_000) return json(req, { error: 'The 2-minute unsend window has ended.' }, 409);
      const paths = attachmentPaths(message.attachments, message.conversation_id, user.id);
      if (paths.length) {
        const { error } = await admin.storage.from('chat-attachments').remove(paths);
        if (error) throw new Error('Could not remove message files.');
      }
      const { error } = await admin.from('messages').delete().eq('id', message.id).eq('sender_id', user.id);
      if (error) throw error;
      return json(req, { ok: true });
    }

    if (body.action === 'export') {
      const [profile, messages, todos, notes, memberships, plans, responses, contacts, blocks, notifications, accounts, reports] = await Promise.all([
        admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        awaitAllRows(() => admin.from('messages').select('id,conversation_id,body,attachments,reply_to_id,created_at,edited_at').eq('sender_id', user.id).order('created_at').order('id')),
        awaitAllRows(() => admin.from('todos').select('*').eq('user_id', user.id).order('created_at').order('id')),
        awaitAllRows(() => admin.from('notes').select('*').eq('user_id', user.id).order('updated_at').order('id')),
        awaitAllRows(() => admin.from('group_members').select('group_id,role,joined_at,group:groups(name)').eq('user_id', user.id).order('group_id')),
        awaitAllRows(() => admin.from('plans').select('*').eq('created_by', user.id).order('created_at').order('id')),
        awaitAllRows(() => admin.from('plan_responses').select('*').eq('user_id', user.id).order('responded_at').order('id')),
        awaitAllRows(() => admin.from('contact_preferences').select('contact_id,nickname,color_key,updated_at').eq('owner_id', user.id).order('contact_id')),
        awaitAllRows(() => admin.from('user_blocks').select('blocked_id,created_at').eq('blocker_id', user.id).order('blocked_id')),
        awaitAllRows(() => admin.from('notifications').select('*').eq('user_id', user.id).order('created_at').order('id')),
        awaitAllRows(() => admin.from('calendar_integrations').select('id,provider,email_address,display_name,granted_scope,connected_at').eq('user_id', user.id).order('id')),
        awaitAllRows(() => admin.from('reports').select('id,reported_user_id,message_id,reason,details,status,created_at').eq('reporter_id', user.id).order('id')),
      ]);
      const results = [profile,messages,todos,notes,memberships,plans,responses,contacts,blocks,notifications,accounts,reports];
      if (results.some(result => result.error)) throw new Error('Account export could not load every section. Retry later.');
      return json(req, {
        exportedAt: new Date().toISOString(),
        accountEmail: user.email ?? null,
        profile: profile.data,
        sentMessages: messages.data ?? [],
        todos: todos.data ?? [],
        notes: notes.data ?? [],
        groupMemberships: memberships.data ?? [],
        plansCreated: plans.data ?? [],
        planResponses: responses.data ?? [],
        contactPreferences: contacts.data ?? [],
        blockedAccounts: blocks.data ?? [],
        notifications: notifications.data ?? [],
        connectedAccounts: accounts.data ?? [],
        submittedReports: reports.data ?? [],
      });
    }

    if (body.action === 'delete_account') {
      if (body.confirmation !== 'DELETE') return json(req, { error: 'Type DELETE to confirm.' }, 400);
      const [messageResult, accountResult] = await Promise.all([
        awaitAllRows(() => admin.from('messages').select('id,conversation_id,attachments').eq('sender_id', user.id).order('id')),
        admin.from('calendar_integrations').select('provider,refresh_token').eq('user_id', user.id),
      ]);
      if (messageResult.error || accountResult.error) throw new Error('Account data could not be checked. Nothing was deleted.');
      const sentMessages=messageResult.data; const accounts=accountResult.data;
      const paths = (sentMessages ?? []).flatMap((message: any) => attachmentPaths(message.attachments, message.conversation_id, user.id));
      for (let index = 0; index < paths.length; index += 100) {
        const { error } = await admin.storage.from('chat-attachments').remove(paths.slice(index, index + 100));
        if (error) throw new Error('Could not remove account files.');
      }
      await Promise.all((accounts ?? []).filter((account: any) => account.provider === 'google').map((account: any) =>
        fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(account.refresh_token)}`, { method: 'POST' }).catch(() => undefined)
      ));
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) throw error;
      return json(req, { ok: true });
    }

    return json(req, { error: 'Unknown action.' }, 400);
  } catch (error) {
    console.error(error);
    return json(req, { error: error instanceof Error ? error.message : 'Relay could not complete that request.' }, 500);
  }
});

function attachmentPaths(value: unknown, conversationId: string, userId: string): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => item && typeof item === 'object' && 'path' in item ? String((item as { path: unknown }).path) : '').filter(path => path.startsWith(`${conversationId}/${userId}/`) && !path.split('/').some(part => part === '..' || part === '.'));
}


// PostgREST caps results per request. Never treat a capped page as a full export.
async function awaitAllRows(query: () => any) {
  const rows: any[] = [];
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await query().range(offset, offset + pageSize - 1);
    if (error) return { data: null, error };
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) return { data: rows, error: null };
  }
}
