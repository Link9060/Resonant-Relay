import { createClient } from '@/lib/supabase/client';
import type { MessageAttachment } from '@/lib/types/database';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function startDirectConversation(otherUserId: string): Promise<ActionResult<{ conversationId: string }>> {
  const { data, error } = await createClient().rpc('get_or_create_direct_conversation', { p_other_user_id: otherUserId });
  return error ? { ok: false, error: 'Could not start that conversation right now.' } : { ok: true, data: { conversationId: data } };
}

export async function createGroup(name: string, memberIds: string[]): Promise<ActionResult<{ conversationId: string }>> {
  const { data, error } = await createClient().rpc('create_group', { p_name: name, p_member_ids: memberIds });
  return error ? { ok: false, error: 'Could not create that group right now.' } : { ok: true, data: { conversationId: data } };
}

export async function leaveGroup(groupId: string): Promise<ActionResult> {
  const { error } = await createClient().rpc('leave_group', { p_group_id: groupId });
  return error ? { ok: false, error: 'Could not leave this group right now.' } : { ok: true, data: undefined };
}

export async function sendMessage(conversationId: string, body: string, files: File[] = []): Promise<ActionResult> {
  const trimmed = body.trim();
  if (!trimmed && files.length === 0) return { ok: false, error: 'Add a message or attachment.' };
  if (trimmed.length > 4000) return { ok: false, error: 'Messages must be 4,000 characters or fewer.' };
  if (files.length > 5) return { ok: false, error: 'You can attach up to five files.' };
  if (files.some((file) => file.size > 10 * 1024 * 1024)) return { ok: false, error: 'Each attachment must be 10 MB or smaller.' };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const attachments: MessageAttachment[] = [];
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'attachment';
    const path = `${conversationId}/${user.id}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from('chat-attachments').upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (error) {
      if (attachments.length) await supabase.storage.from('chat-attachments').remove(attachments.map((item) => item.path));
      return { ok: false, error: `Could not upload ${file.name}. Check the file type and 10 MB limit.` };
    }
    attachments.push({ path, name: file.name.slice(0, 180), type: file.type || 'application/octet-stream', size: file.size });
  }
  const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, sender_id: user.id, body: trimmed, attachments });
  if (error) {
    if (attachments.length) await supabase.storage.from('chat-attachments').remove(attachments.map((item) => item.path));
    return { ok: false, error: 'Could not send that message right now.' };
  }
  return { ok: true, data: undefined };
}

export async function editMessage(messageId: string, body: string): Promise<ActionResult<{
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  attachments: MessageAttachment[];
}>> {
  const trimmed = body.trim();
  if (!trimmed) return { ok: false, error: 'Message is empty.' };
  if (trimmed.length > 4000) return { ok: false, error: 'Messages must be 4,000 characters or fewer.' };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase
    .from('messages')
    .update({ body: trimmed })
    .eq('id', messageId)
    .eq('sender_id', user.id)
    .select('id,conversation_id,sender_id,body,created_at,edited_at,attachments')
    .single();

  return error || !data
    ? { ok: false, error: 'That message can no longer be edited.' }
    : { ok: true, data };
}
