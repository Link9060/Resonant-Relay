import 'server-only';
import { createServiceRoleClient } from '@/lib/supabase/service';
import type { NotificationType } from '@/lib/types/database';

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/**
 * Inserts a notification row for one recipient. Uses the service-role
 * client deliberately: this is the app writing to someone else's feed
 * ("you got a connection request"), which per-user RLS can't express safely
 * — see supabase/migrations/0005_notifications.sql for why there's no
 * client-facing INSERT policy on this table at all.
 */
export async function createNotification(input: NotificationInput) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('notifications')
    .insert({ user_id: input.userId, type: input.type, title: input.title, body: input.body, link: input.link ?? null })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create notification: ${error.message}`);
  return data.id as string;
}

/** Same notification content fanned out to several recipients at once (e.g. everyone in a group). */
export async function createNotifications(userIds: string[], content: Omit<NotificationInput, 'userId'>) {
  if (userIds.length === 0) return;
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from('notifications').insert(
    userIds.map((userId) => ({
      user_id: userId,
      type: content.type,
      title: content.title,
      body: content.body,
      link: content.link ?? null,
    }))
  );

  if (error) throw new Error(`Failed to create notifications: ${error.message}`);
}
