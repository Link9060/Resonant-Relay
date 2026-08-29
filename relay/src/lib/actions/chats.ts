'use server';

import { createClient } from '@/lib/supabase/server';
import { notifyMany } from '@/lib/notifications/notify';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function startDirectConversation(otherUserId: string): Promise<ActionResult<{ conversationId: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_or_create_direct_conversation', {
    p_other_user_id: otherUserId,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { conversationId: data } };
}

export async function createGroup(name: string, memberIds: string[]): Promise<ActionResult<{ conversationId: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase.rpc('create_group', { p_name: name, p_member_ids: memberIds });
  if (error) return { ok: false, error: error.message };

  const { data: creatorProfile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single();
  await notifyMany(memberIds, {
    type: 'group_added',
    title: 'Added to a group',
    body: `${creatorProfile?.display_name ?? 'Someone'} added you to "${name}".`,
    link: `/chats/${data}`,
  }).catch(() => {});

  revalidatePath('/chats');
  return { ok: true, data: { conversationId: data } };
}

export async function leaveGroup(groupId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('leave_group', { p_group_id: groupId });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/chats');
  redirect('/chats');
}

export async function sendMessage(conversationId: string, body: string): Promise<ActionResult> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: 'Message is empty.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body: trimmed });

  if (error) return { ok: false, error: error.message };

  await notifyRecipients(supabase, conversationId, user.id, trimmed).catch(() => {
    // A notification failure shouldn't surface as a failed send — the
    // message itself already succeeded.
  });

  return { ok: true, data: undefined };
}

async function notifyRecipients(
  supabase: Awaited<ReturnType<typeof createClient>>,
  conversationId: string,
  senderId: string,
  body: string
) {
  const [{ data: conversation }, { data: participants }, { data: senderProfile }] = await Promise.all([
    supabase.from('conversations').select('type, group:groups(name)').eq('id', conversationId).single(),
    supabase.from('conversation_participants').select('user_id').eq('conversation_id', conversationId),
    supabase.from('profiles').select('display_name').eq('id', senderId).single(),
  ]);

  const recipientIds = (participants ?? []).map((p) => p.user_id).filter((id) => id !== senderId);
  if (recipientIds.length === 0) return;

  const senderName = senderProfile?.display_name ?? 'Someone';
  const isGroup = conversation?.type === 'group';
  const groupName = (conversation as any)?.group?.name as string | undefined;

  await notifyMany(recipientIds, {
    type: 'new_message',
    title: isGroup && groupName ? groupName : senderName,
    body: isGroup ? `${senderName}: ${truncate(body)}` : truncate(body),
    link: `/chats/${conversationId}`,
  });
}

function truncate(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
