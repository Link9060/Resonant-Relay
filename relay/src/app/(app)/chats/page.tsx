import { NewChatDialog } from '@/components/chats/new-chat-dialog';
import { ConversationList } from '@/components/chats/conversation-list';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export default async function ChatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: participantRows } = await supabase
    .from('conversation_participants')
    .select(
      `conversation:conversations(
        id, type, last_message_at,
        group:groups(id, name),
        participants:conversation_participants(user_id, profile:profiles(id, display_name, avatar_url))
      )`
    )
    .eq('user_id', user.id);

  const conversations = (participantRows ?? [])
    .map((row: any) => row.conversation)
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  const conversationIds = conversations.map((c: any) => c.id);
  const { data: recentMessages } = conversationIds.length
    ? await supabase
        .from('messages')
        .select('conversation_id, body, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
    : { data: [] };

  const previewByConversation = new Map<string, string>();
  for (const m of recentMessages ?? []) {
    if (!previewByConversation.has(m.conversation_id)) {
      previewByConversation.set(m.conversation_id, m.body);
    }
  }

  const contactsForDialog = await getContactsForDialog(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <PageHeader title="Chats" action={<NewChatDialog contacts={contactsForDialog} />} />

      <div className="mt-6">
        <ConversationList
          conversations={conversations}
          currentUserId={user.id}
          previewByConversation={previewByConversation}
        />
      </div>
    </div>
  );
}

async function getContactsForDialog(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const [asA, asB] = await Promise.all([
    supabase
      .from('connections')
      .select('other:profiles!connections_user_b_fkey(id, display_name, avatar_url)')
      .eq('user_a', userId),
    supabase
      .from('connections')
      .select('other:profiles!connections_user_a_fkey(id, display_name, avatar_url)')
      .eq('user_b', userId),
  ]);

  return [...(asA.data ?? []), ...(asB.data ?? [])].map((row: any) => row.other);
}
