import type { SupabaseClient } from '@supabase/supabase-js';

export type ChatCursor = { id: string; created_at: string };
// Reload the entire displayed window, including records deleted during a gap.
// Keyset pagination also handles bursts larger than the initial 200 messages.
export async function recoverChat(client: SupabaseClient, conversationId: string, userId: string, first: ChatCursor | null) {
  const messages = [];
  let cursor: ChatCursor | null = null;
  for (;;) {
    let query = client.from('messages').select('id,conversation_id,sender_id,body,created_at,edited_at,attachments,reply_to_id').eq('conversation_id', conversationId);
    if (first) query = query.gte('created_at', first.created_at);
    if (cursor) query = query.or(`created_at.gt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.gt.${cursor.id})`);
    query = query.order('created_at', {ascending: Boolean(first)}).order('id', {ascending: Boolean(first)}).limit(200);
    const {data, error} = await query.abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
    messages.push(...(data ?? []));
    if (!first || (data?.length ?? 0) < 200) break;
    cursor = data![data!.length - 1]!;
  }
  if (!first) messages.reverse();
  const reactions = [], pins: string[] = [], hidden = new Set<string>();
  for (let offset = 0; offset < messages.length; offset += 200) {
    const ids = messages.slice(offset, offset + 200).map(row => row.id);
    const [hiddenResult, reactionResult, pinResult] = await Promise.all([
      client.from('hidden_messages').select('message_id').eq('user_id', userId).in('message_id', ids).abortSignal(AbortSignal.timeout(15000)),
      client.from('message_reactions').select('*').in('message_id', ids).abortSignal(AbortSignal.timeout(15000)),
      client.from('message_pins').select('message_id').eq('user_id', userId).in('message_id', ids).abortSignal(AbortSignal.timeout(15000)),
    ]);
    for (const result of [hiddenResult, reactionResult, pinResult]) if (result.error) throw result.error;
    for (const row of hiddenResult.data ?? []) hidden.add(row.message_id);
    reactions.push(...(reactionResult.data ?? []));
    pins.push(...(pinResult.data ?? []).map(row => row.message_id));
  }
  return {oldest: messages[0] ?? null, hasOlder: !first && messages.length === 200, messages: messages.filter(row => !hidden.has(row.id)), reactions: reactions.filter(row => !hidden.has(row.message_id)), pins: pins.filter(id => !hidden.has(id))};
}
