import 'server-only';
import webpush from 'web-push';
import { createServiceRoleClient } from '@/lib/supabase/service';

let configured = false;
function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  link?: string;
}

/**
 * Delivers a push to every browser/device the user has enabled
 * notifications on. The browser's push service (and the OS, e.g. macOS
 * Notification Center) shows this even if Relay isn't the focused tab —
 * that's the whole point of Web Push over an in-app-only notification.
 * Silently does nothing if VAPID keys aren't configured or the user has no
 * active subscriptions, so this is always safe to call.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
  ensureConfigured();

  const supabase = createServiceRoleClient();
  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('user_id', userId);

  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify(payload)
        );
      } catch (err: any) {
        // 404/410 means the browser has invalidated this subscription
        // (uninstalled, permissions revoked, etc.) — clean it up rather than
        // retrying it forever.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      }
    })
  );
}
