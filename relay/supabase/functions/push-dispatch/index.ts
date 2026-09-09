import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

type VapidDetails = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SECRET_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) return Response.json({ error: 'Push service is unavailable.' }, { status: 503 });

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));

  try {
    const vapid = await getVapidDetails(admin);
    if (body.action === 'health') return Response.json({ configured: true, publicKey: vapid.publicKey });

    const notificationId = typeof body.notificationId === 'string' ? body.notificationId : null;
    if (!notificationId) return Response.json({ error: 'Missing notification.' }, { status: 400 });

    const { data: notification, error: notificationError } = await admin
      .from('notifications')
      .select('id,user_id,title,body,link,pushed_at')
      .eq('id', notificationId)
      .maybeSingle();

    if (notificationError) throw notificationError;
    if (!notification || notification.pushed_at) return Response.json({ ok: true, sent: 0 });

    const { data: subscriptions, error: subscriptionsError } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth_key')
      .eq('user_id', notification.user_id);

    if (subscriptionsError) throw subscriptionsError;
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

    let sent = 0;
    await Promise.all((subscriptions ?? []).map(async (subscription) => {
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
          JSON.stringify({ id: notification.id, title: notification.title, body: notification.body, link: notification.link ?? '/' }),
          { TTL: 300, urgency: 'high' },
        );
        sent += 1;
      } catch (error) {
        const statusCode = Number((error as { statusCode?: number })?.statusCode ?? 0);
        if ([400, 401, 403, 404, 410].includes(statusCode)) {
          await admin.from('push_subscriptions').delete().eq('id', subscription.id);
        } else {
          console.error('Push delivery failed', error);
        }
      }
    }));

    await admin.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', notification.id).is('pushed_at', null);
    return Response.json({ ok: true, sent });
  } catch (error) {
    console.error('Push dispatch failed', error);
    return Response.json({ error: 'Push delivery failed.' }, { status: 500 });
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
