import { createClient } from '@/lib/supabase/client';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function startDirectConversation(otherUserId: string): Promise<ActionResult<{ conversationId: string }>> {
  const { data, error } = await createClient().rpc('get_or_create_direct_conversation', { p_other_user_id: otherUserId });
  return error ? { ok: false, error: error.message } : { ok: true, data: { conversationId: data } };
}

export async function createGroup(name: string, memberIds: string[]): Promise<ActionResult<{ conversationId: string }>> {
  const { data, error } = await createClient().rpc('create_group', { p_name: name, p_member_ids: memberIds });
  return error ? { ok: false, error: error.message } : { ok: true, data: { conversationId: data } };
}

export async function leaveGroup(groupId: string): Promise<ActionResult> {
  const { error } = await createClient().rpc('leave_group', { p_group_id: groupId });
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined };
}

export async function sendMessage(conversationId: string, body: string): Promise<ActionResult> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: 'Message is empty.' };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, body: trimmed });
  return error ? { ok: false, error: error.message } : { ok: true, data: undefined };
}
