'use client';

import { MessageThread } from '@/components/chats/message-thread';
import { PageLoading } from '@/components/page-loading';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Suspense,useEffect,useState } from 'react';

function ConversationView(){const params=useSearchParams();const id=params.get('id');const[state,setState]=useState<any>(null);useEffect(()=>{if(!id)return;void(async()=>{const s=createClient();const{data:{user}}=await s.auth.getUser();if(!user)return;const{data:c}=await s.from('conversations').select(`id,type,group_id,group:groups(id,name),participants:conversation_participants(user_id,profile:profiles(id,display_name,avatar_url))`).eq('id',id).single();if(!c){setState({error:'Conversation not found.'});return;}const{data:messages}=await s.from('messages').select('id,conversation_id,sender_id,body,created_at').eq('conversation_id',id).order('created_at',{ascending:true}).limit(200);const participants=(c as any).participants;const title=c.type==='group'?(c as any).group?.name??'Group':participants.find((p:any)=>p.user_id!==user.id)?.profile.display_name??'Contact';setState({c,userId:user.id,title,messages:messages??[],profiles:Object.fromEntries(participants.map((p:any)=>[p.user_id,p.profile]))});})()},[id]);if(!id)return <p className="p-8 text-sm text-red-500">Missing conversation.</p>;if(!state)return <PageLoading/>;if(state.error)return <p className="p-8 text-sm text-red-500">{state.error}</p>;return <MessageThread conversationId={state.c.id} title={state.title} isGroup={state.c.type==='group'} groupId={state.c.group_id} currentUserId={state.userId} participantsById={state.profiles} initialMessages={state.messages}/>}
export default function ConversationPage(){return <Suspense fallback={<PageLoading/>}><ConversationView/></Suspense>}
