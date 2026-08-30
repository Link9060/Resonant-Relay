import { createClient } from '@/lib/supabase/client';

export async function markNotificationRead(id: string) {
  await createClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
}

export async function markAllNotificationsRead() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
}

export interface PushSubscriptionInput { endpoint: string; keys: { p256dh: string; auth: string } }

export async function savePushSubscription(subscription: PushSubscriptionInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not signed in.' };
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth_key: subscription.keys.auth,
  }, { onConflict: 'endpoint' });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function removePushSubscription(endpoint: string) {
  await createClient().from('push_subscriptions').delete().eq('endpoint', endpoint);
}
