'use client';

import { NewChatDialog } from '@/components/chats/new-chat-dialog';
import { ConversationList } from '@/components/chats/conversation-list';
import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function ChatsPage() {
  const [state, setState] = useState<any>(null);
  useEffect(() => { void (async () => {
    const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data: rows } = await supabase.from('conversation_participants').select(`conversation:conversations(id,type,last_message_at,group:groups(id,name),participants:conversation_participants(user_id,profile:profiles(id,display_name,avatar_url)))`).eq('user_id', user.id);
    const conversations = (rows ?? []).map((r: any) => r.conversation).filter(Boolean).sort((a: any,b: any) => new Date(b.last_message_at).getTime()-new Date(a.last_message_at).getTime());
    const ids = conversations.map((c: any) => c.id);
    const { data: messages } = ids.length ? await supabase.from('messages').select('conversation_id,body,created_at').in('conversation_id', ids).order('created_at',{ascending:false}) : { data: [] };
    const previews = new Map<string,string>(); for (const m of messages ?? []) if (!previews.has(m.conversation_id)) previews.set(m.conversation_id,m.body);
    const [asA,asB] = await Promise.all([
      supabase.from('connections').select('other:profiles!connections_user_b_fkey(id,display_name,avatar_url)').eq('user_a',user.id),
      supabase.from('connections').select('other:profiles!connections_user_a_fkey(id,display_name,avatar_url)').eq('user_b',user.id),
    ]);
    const contacts=[...(asA.data??[]),...(asB.data??[])].map((r:any)=>r.other).filter(Boolean);
    const{data:preferences}=contacts.length?await supabase.from('contact_preferences').select('contact_id,nickname,color_key').eq('owner_id',user.id).in('contact_id',contacts.map((contact:any)=>contact.id)):{data:[]};
    const preferencesById=Object.fromEntries((preferences??[]).map((preference:any)=>[preference.contact_id,preference]));
    setState({ userId:user.id, conversations, previews, contacts:contacts.map((contact:any)=>({...contact,preference:preferencesById[contact.id]??null})), preferencesById });
  })(); }, []);
  if (!state) return <PageLoading />;
  return <div className="mx-auto max-w-2xl px-4 py-8 md:px-6"><PageHeader title="Chats" action={<NewChatDialog contacts={state.contacts} />} /><div className="mt-6"><ConversationList conversations={state.conversations} currentUserId={state.userId} previewByConversation={state.previews} preferencesById={state.preferencesById} /></div></div>;
}
