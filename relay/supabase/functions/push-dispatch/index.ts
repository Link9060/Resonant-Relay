import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:relay-notifications@outlook.com';
  const body = await req.json();
  if (body.action === 'health') return Response.json({ configured: Boolean(publicKey && privateKey) });
  if (!publicKey || !privateKey) return Response.json({ error: 'Push delivery is not configured.' }, { status: 503 });
  const { notificationId } = body;
  if (!notificationId) return Response.json({ error: 'Missing notification.' }, { status: 400 });
  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', { auth: { persistSession: false } });
  const { data: notification } = await admin.from('notifications').select('id,user_id,title,body,link,pushed_at').eq('id', notificationId).maybeSingle();
  if (!notification || notification.pushed_at) return Response.json({ ok: true, sent: 0 });
  const { data: subscriptions } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth_key').eq('user_id', notification.user_id);
  webpush.setVapidDetails(subject, publicKey, privateKey);
  let sent = 0;
  await Promise.all((subscriptions ?? []).map(async (subscription: any) => {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } }, JSON.stringify({ id: notification.id, title: notification.title, body: notification.body, link: notification.link ?? '/' }), { TTL: 300, urgency: 'high' });
      sent += 1;
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id);
      else console.error(error);
    }
  }));
  await admin.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', notification.id).is('pushed_at', null);
  return Response.json({ ok: true, sent });
});
