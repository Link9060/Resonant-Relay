import { createClient } from '@/lib/supabase/client';

export type ConversationDeleteResult = { ok: true } | { ok: false; error: string };

export async function deleteConversationForMe(conversationId: string): Promise<ConversationDeleteResult> {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { error } = await supabase
    .from('conversation_preferences')
    .upsert({
      conversation_id: conversationId,
      user_id: user.id,
      deleted_at: new Date().toISOString(),
      pinned_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'conversation_id,user_id' });

  return error
    ? { ok: false, error: 'Could not delete this conversation from your Chats view.' }
    : { ok: true };
}
