'use client';

import { MessageThread } from '@/components/chats/message-thread';
import { PageLoading } from '@/components/page-loading';
import { contactDisplayName } from '@/lib/contact-colors';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function ConversationView() {
  const params = useSearchParams();
  const id = params.get('id');
  const [state, setState] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: conversation } = await supabase.from('conversations').select(`id,type,group_id,group:groups(id,name),participants:conversation_participants(user_id,profile:profiles(id,display_name,avatar_url))`).eq('id', id).single();
      if (!conversation) { setState({ error: 'Conversation not found.' }); return; }
      const { data: rawMessages } = await supabase.from('messages').select('id,conversation_id,sender_id,body,created_at,edited_at,attachments,reply_to_id').eq('conversation_id', id).order('created_at', { ascending: true }).limit(200);
      const messageIds = (rawMessages ?? []).map((message) => message.id);
      const [hiddenResult, reactionResult, pinResult, preferenceResult, memberResult] = await Promise.all([
        messageIds.length ? supabase.from('hidden_messages').select('message_id').eq('user_id', user.id).in('message_id', messageIds) : Promise.resolve({ data: [] }),
        messageIds.length ? supabase.from('message_reactions').select('*').in('message_id', messageIds) : Promise.resolve({ data: [] }),
        messageIds.length ? supabase.from('message_pins').select('message_id').eq('user_id', user.id).in('message_id', messageIds) : Promise.resolve({ data: [] }),
        supabase.from('conversation_preferences').select('muted').eq('conversation_id', id).eq('user_id', user.id).maybeSingle(),
        conversation.group_id ? supabase.from('group_members').select('user_id,role').eq('group_id', conversation.group_id) : Promise.resolve({ data: [] }),
      ]);
      const hidden = new Set((hiddenResult.data ?? []).map((item: any) => item.message_id));
      const messages = (rawMessages ?? []).filter((message) => !hidden.has(message.id));
      await supabase.rpc('mark_conversation_read', { p_conversation_id: id });
      const participants = (conversation as any).participants.filter((participant: any) => participant.profile);
      const participantIds = participants.map((participant: any) => participant.user_id).filter((userId: string) => userId !== user.id);
      const { data: preferences } = participantIds.length ? await supabase.from('contact_preferences').select('contact_id,nickname,color_key').eq('owner_id', user.id).in('contact_id', participantIds) : { data: [] };
      const preferencesById = Object.fromEntries((preferences ?? []).map((preference: any) => [preference.contact_id, preference]));
      const other = participants.find((participant: any) => participant.user_id !== user.id);
      const title = conversation.type === 'group' ? (conversation as any).group?.name ?? 'Group' : other ? contactDisplayName(other.profile, preferencesById[other.user_id]) : 'Contact';
      setState({ conversation, userId: user.id, title, messages, profiles: Object.fromEntries(participants.map((participant: any) => [participant.user_id, participant.profile])), preferencesById, rolesById: Object.fromEntries((memberResult.data ?? []).map((member: any) => [member.user_id, member.role])), reactions: reactionResult.data ?? [], pinnedIds: (pinResult.data ?? []).map((item: any) => item.message_id), muted: Boolean(preferenceResult.data?.muted) });
    })();
  }, [id]);

  if (!id) return <p className="p-8 text-sm text-red-500">Missing conversation.</p>;
  if (!state) return <PageLoading />;
  if (state.error) return <p className="p-8 text-sm text-red-500">{state.error}</p>;
  return <MessageThread conversationId={state.conversation.id} title={state.title} isGroup={state.conversation.type === 'group'} groupId={state.conversation.group_id} currentUserId={state.userId} participantsById={state.profiles} preferencesById={state.preferencesById} rolesById={state.rolesById} initialMessages={state.messages} initialReactions={state.reactions} initialPinnedIds={state.pinnedIds} initialMuted={state.muted} />;
}

export default function ConversationPage() { return <Suspense fallback={<PageLoading />}><ConversationView /></Suspense>; }
