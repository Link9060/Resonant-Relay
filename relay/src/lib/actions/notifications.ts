import { createClient } from '@/lib/supabase/client';

export async function markNotificationRead(id: string) {
  const { error } = await createClient().from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  return {ok: !error};
}

export async function markAllNotificationsRead(cutoff = new Date().toISOString()) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {ok:false};
  const { error } = await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null).lte('created_at', cutoff);
  return {ok: !error};
}

export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  deviceName: string;
}

export async function savePushSubscription(subscription: PushSubscriptionInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not signed in.' };
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth_key: subscription.keys.auth,
    device_name: subscription.deviceName.slice(0, 80),
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

export async function removePushSubscription(endpoint: string) {
  const { error } = await createClient().from('push_subscriptions').delete().eq('endpoint', endpoint);
  if (error) throw new Error('This device could not be removed. Retry before disabling alerts.');
}

export async function removePushDevice(id: string) {
  const { error } = await createClient().from('push_subscriptions').delete().eq('id', id);
  return error ? { ok: false as const, error: error.message } : { ok: true as const };
}

