import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type VapidDetails = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

const ALLOWED_ORIGINS = new Set([
  'https://enterarrow.com',
  'https://www.enterarrow.com',
  'https://resonantrelay.org',
  'https://www.resonantrelay.org',
  'https://link9060.github.io',
  'http://localhost:3000',
]);

function cors(req: Request) {
  const origin = req.headers.get('Origin');
  return {
    ...(origin && ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-relay-dispatch-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
}

function json(req: Request, body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { ...cors(req), 'Cache-Control': 'no-store' },
  });
}

function namedKey(variable: string, fallback: string) {
  const encoded = Deno.env.get(variable);
  if (encoded) {
    try {
      const values = JSON.parse(encoded) as Record<string, string>;
      if (values.default) return values.default;
    } catch {}
  }
  return Deno.env.get(fallback) ?? '';
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = namedKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || '';
  if (!supabaseUrl || !serviceKey) return json(req, { error: 'Push service is unavailable.' }, 503);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));

  try {
    const vapid = await getVapidDetails(admin);
    if (body.action === 'health') return json(req, { configured: true, publicKey: vapid.publicKey });

    if (body.action === 'test') {
      const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return json(req, { error: 'Sign in to send a test alert.' }, 401);

      const { data: authData, error: authError } = await admin.auth.getUser(token);
      if (authError || !authData.user) return json(req, { error: 'Your session has expired.' }, 401);

      const { data: subscriptions, error: subscriptionsError } = await admin
        .from('push_subscriptions')
        .select('id,endpoint,p256dh,auth_key')
        .eq('user_id', authData.user.id);
      if (subscriptionsError) throw subscriptionsError;
      if (!subscriptions?.length) return json(req, { error: 'Enable alerts on this device first.' }, 409);

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
      if (recent) return json(req, { error: 'Wait a few seconds before sending another test.' }, 429);

      const testPayload = {
        id: `test-${crypto.randomUUID()}`,
        title: 'Relay notifications are working',
        body: 'This device can receive alerts even when Relay is closed.',
        link: '/profile#notifications',
      };
      const delivery = await deliverPush(admin, vapid, subscriptions as PushSubscriptionRow[], testPayload);
      if (delivery.sent === 0) {
        return json(req, {
          error: delivery.failed > 0
            ? 'The device push service rejected this alert. Reload Relay, then enable device alerts again.'
            : 'No registered device accepted the alert.',
          ...delivery,
        }, 502);
      }

      const { data: testNotification, error: testError } = await admin
        .from('notifications')
        .insert({
          user_id: authData.user.id,
          type: 'system',
          title: testPayload.title,
          body: testPayload.body,
          link: testPayload.link,
          pushed_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (testError) throw testError;
      return json(req, { ok: true, ...delivery, notificationId: testNotification.id });
    }

    const { data: deliveryConfig, error: configError } = await admin
      .from('push_delivery_config')
      .select('dispatch_secret')
      .eq('id', 1)
      .single();
    if (configError || !deliveryConfig?.dispatch_secret) {
      throw configError ?? new Error('Push dispatch authentication is unavailable.');
    }
    const suppliedSecret = req.headers.get('X-Relay-Dispatch-Secret') ?? '';
    if (!safeEqual(suppliedSecret, deliveryConfig.dispatch_secret)) {
      return json(req, { error: 'Unauthorized.' }, 401);
    }

    const notificationId = typeof body.notificationId === 'string' ? body.notificationId : null;
    if (!notificationId) return json(req, { error: 'Missing notification.' }, 400);

    const claimTime = new Date().toISOString();
    const staleClaim = new Date(Date.now() - 5 * 60_000).toISOString();
    const { data: notification, error: notificationError } = await admin
      .from('notifications')
      .update({ push_claimed_at: claimTime })
      .eq('id', notificationId)
      .is('pushed_at', null)
      .or(`push_claimed_at.is.null,push_claimed_at.lt.${staleClaim}`)
      .select('id,user_id,type,title,body,link,pushed_at')
      .maybeSingle();

    if (notificationError) throw notificationError;
    if (!notification) return json(req, { ok: true, sent: 0 });

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth_key')
      .eq('user_id', notification.user_id);

    if (subscriptionsError) throw subscriptionsError;
    const { sent, failed } = await deliverPush(admin, vapid, (subscriptions ?? []) as PushSubscriptionRow[], {
      id: notification.id,
      title: notification.title,
      body: notification.type === 'new_message' ? 'Open Relay to read your new message.' : notification.body,
      link: notification.link ?? '/',
    });

    if (sent > 0) {
      await admin.from('notifications').update({ pushed_at: new Date().toISOString(), push_claimed_at: null }).eq('id', notification.id).eq('push_claimed_at', claimTime);
    } else {
      await admin.from('notifications').update({ push_claimed_at: null }).eq('id', notification.id).eq('push_claimed_at', claimTime);
    }
    return json(req, { ok: true, sent, failed });
  } catch (error) {
    console.error('Push dispatch failed', error);
    return json(req, { error: 'Push delivery failed.' }, 500);
  }
});

async function deliverPush(
  admin: ReturnType<typeof createClient>,
  vapid: VapidDetails,
  subscriptions: PushSubscriptionRow[],
  payload: { id: string; title: string; body: string; link: string },
) {
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  let sent = 0;
  let failed = 0;
  const rejectedStatuses: number[] = [];
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
        JSON.stringify(payload),
        { TTL: 300, urgency: 'high' },
      );
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode = Number((error as { statusCode?: number })?.statusCode ?? 0);
      rejectedStatuses.push(statusCode);
      if ([400, 401, 403, 404, 410].includes(statusCode)) {
        await admin.from('push_subscriptions').delete().eq('id', subscription.id);
      } else {
        console.error('Push delivery failed', { statusCode });
      }
    }
  }));
  return { sent, failed, rejectedStatuses };
}

async function getVapidDetails(admin: ReturnType<typeof createClient>): Promise<VapidDetails> {
  const { data: stored, error: readError } = await admin
    .from('push_delivery_config')
    .select('public_key,private_key,subject')
    .eq('id', 1)
    .maybeSingle();
  if (readError) throw readError;
  if (stored) return { publicKey: stored.public_key, privateKey: stored.private_key, subject: stored.subject };

  const envPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const envPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:relay-notifications@outlook.com';
  const generated = envPublicKey && envPrivateKey
    ? { publicKey: envPublicKey, privateKey: envPrivateKey }
    : webpush.generateVAPIDKeys();
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
