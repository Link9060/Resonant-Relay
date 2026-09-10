import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type VapidDetails = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return json({ error: 'Push service is unavailable.' }, 503);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));

  try {
    const vapid = await getVapidDetails(admin);
    if (body.action === 'health') return json({ configured: true, publicKey: vapid.publicKey });

    if (body.action === 'test') {
      const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return json({ error: 'Sign in to send a test alert.' }, 401);

      const { data: authData, error: authError } = await admin.auth.getUser(token);
      if (authError || !authData.user) return json({ error: 'Your session has expired.' }, 401);

      const { count, error: countError } = await admin
        .from('push_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', authData.user.id);
      if (countError) throw countError;
      if (!count) return json({ error: 'Enable alerts on this device first.' }, 409);

      const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
      const { data: recent, error: recentError } = await admin
        .from('notifications')
        .select('id')
        .eq('user_id', authData.user.id)
        .eq('type', 'system')
        .gte('created_at', tenSecondsAgo)
        .limit(1)
        .maybeSingle();
      if (recentError) throw recentError;
      if (recent) return json({ ok: true, queued: false, cooldown: true });

      const { data: testNotification, error: testError } = await admin
        .from('notifications')
        .insert({
          user_id: authData.user.id,
          type: 'system',
          title: 'Relay notifications are working',
          body: 'This device can receive alerts even when Relay is closed.',
          link: '/profile#notifications',
        })
        .select('id')
        .single();
      if (testError) throw testError;
      return json({ ok: true, queued: true, notificationId: testNotification.id });
    }

    const notificationId = typeof body.notificationId === 'string' ? body.notificationId : null;
    if (!notificationId) return json({ error: 'Missing notification.' }, 400);

    const { data: notification, error: notificationError } = await admin
      .from('notifications')
      .select('id,user_id,title,body,link,pushed_at')
      .eq('id', notificationId)
      .maybeSingle();

    if (notificationError) throw notificationError;
    if (!notification || notification.pushed_at) return json({ ok: true, sent: 0 });

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth_key')
      .eq('user_id', notification.user_id);

    if (subscriptionsError) throw subscriptionsError;
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

    let sent = 0;
    let failed = 0;
    await Promise.all((subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
          JSON.stringify({ id: notification.id, title: notification.title, body: notification.body, link: notification.link ?? '/' }),
          { TTL: 300, urgency: 'high' },
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = Number((error as { statusCode?: number })?.statusCode ?? 0);
        if ([400, 401, 403, 404, 410].includes(statusCode)) {
          await admin.from('push_subscriptions').delete().eq('id', subscription.id);
        } else {
          console.error('Push delivery failed', error);
        }
      }
    }));

    if (sent > 0) {
      await admin.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', notification.id).is('pushed_at', null);
    }
    return json({ ok: true, sent, failed });
  } catch (error) {
    console.error('Push dispatch failed', error);
    return json({ error: 'Push delivery failed.' }, 500);
  }
});

async function getVapidDetails(admin: ReturnType<typeof createClient>): Promise<VapidDetails> {
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:relay-notifications@outlook.com';
  if (publicKey && privateKey) return { publicKey, privateKey, subject };

  const { data: stored, error: readError } = await admin
    .from('push_delivery_config')
    .select('public_key,private_key,subject')
    .eq('id', 1)
    .maybeSingle();
  if (readError) throw readError;
  if (stored) return { publicKey: stored.public_key, privateKey: stored.private_key, subject: stored.subject };

  const generated = webpush.generateVAPIDKeys();
  const { error: insertError } = await admin.from('push_delivery_config').insert({
    id: 1,
    public_key: generated.publicKey,
    private_key: generated.privateKey,
    subject,
  });

  if (!insertError) return { publicKey: generated.publicKey, privateKey: generated.privateKey, subject };
  if (insertError.code !== '23505') throw insertError;

  const { data: winner, error: winnerError } = await admin
    .from('push_delivery_config')
    .select('public_key,private_key,subject')
    .eq('id', 1)
    .single();
  if (winnerError) throw winnerError;
  return { publicKey: winner.public_key, privateKey: winner.private_key, subject: winner.subject };
}
