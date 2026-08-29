import 'server-only';
import { createNotification, createNotifications, type NotificationInput } from '@/lib/notifications/create';
import { sendPushToUser } from '@/lib/notifications/push';

/** Notify one person: writes the in-app feed row, then best-effort pushes it. */
export async function notify(input: NotificationInput) {
  await createNotification(input);
  await sendPushToUser(input.userId, { title: input.title, body: input.body, link: input.link });
}

/** Notify several people with the same content (e.g. everyone in a group). */
export async function notifyMany(userIds: string[], content: Omit<NotificationInput, 'userId'>) {
  await createNotifications(userIds, content);
  await Promise.all(userIds.map((userId) => sendPushToUser(userId, { ...content })));
}
