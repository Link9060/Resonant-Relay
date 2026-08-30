'use client';

import { AddPersonDialog } from '@/components/contacts/add-person-dialog';
import { RequestsList } from '@/components/contacts/requests-list';
import { ContactsList } from '@/components/contacts/contacts-list';
import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export default function ContactsPage() {
  const [state,setState]=useState<any>(null);
  useEffect(()=>{ let active=true; void (async()=>{ const supabase=createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return;
    const [a,b,incoming,outgoing]=await Promise.all([
      supabase.from('connections').select('id,created_at,other:profiles!connections_user_b_fkey(id,display_name,avatar_url,school)').eq('user_a',user.id),
      supabase.from('connections').select('id,created_at,other:profiles!connections_user_a_fkey(id,display_name,avatar_url,school)').eq('user_b',user.id),
      supabase.from('connection_requests').select('id,created_at,sender:profiles!connection_requests_sender_id_fkey(id,display_name,avatar_url,school)').eq('recipient_id',user.id).eq('status','pending'),
      supabase.from('connection_requests').select('id,created_at,recipient:profiles!connection_requests_recipient_id_fkey(id,display_name,avatar_url,school)').eq('sender_id',user.id).eq('status','pending'),
    ]); if(active)setState({contacts:[...(a.data??[]),...(b.data??[])].sort((x,y)=>new Date(y.created_at).getTime()-new Date(x.created_at).getTime()),incoming:incoming.data??[],outgoing:outgoing.data??[]}); })(); return()=>{active=false}; },[]); if(!state)return <PageLoading />;
  return <div className="mx-auto max-w-2xl px-4 py-8 md:px-6"><PageHeader title="Contacts" action={<AddPersonDialog />} /><RequestsList incoming={state.incoming} outgoing={state.outgoing} /><div className="mt-8"><h2 className="mb-3 text-sm font-medium text-ink-muted">{state.contacts.length===0?'No contacts yet':`${state.contacts.length} contact${state.contacts.length===1?'':'s'}`}</h2><ContactsList contacts={state.contacts} /></div></div>;
}
