import { MessageThread } from '@/components/chats/message-thread';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function ConversationPage({ params }: { params: { conversationId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS means this simply returns null if the user isn't a participant —
  // there's no separate authorization check to remember to write here.
  const { data: conversation } = await supabase
    .from('conversations')
    .select(
      `id, type, group_id,
       group:groups(id, name),
       participants:conversation_participants(user_id, profile:profiles(id, display_name, avatar_url))`
    )
    .eq('id', params.conversationId)
    .single();

  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, created_at')
    .eq('conversation_id', params.conversationId)
    .order('created_at', { ascending: true })
    .limit(200);

  const participants = (conversation as any).participants as {
    user_id: string;
    profile: { id: string; display_name: string; avatar_url: string | null };
  }[];

  const title =
    conversation.type === 'group'
      ? (conversation as any).group?.name ?? 'Group'
      : participants.find((p) => p.user_id !== user.id)?.profile.display_name ?? 'Contact';

  const participantsById = new Map(participants.map((p) => [p.user_id, p.profile]));

  return (
    <MessageThread
      conversationId={conversation.id}
      title={title}
      isGroup={conversation.type === 'group'}
      groupId={conversation.group_id}
      currentUserId={user.id}
      participantsById={Object.fromEntries(participantsById)}
      initialMessages={messages ?? []}
    />
  );
}
