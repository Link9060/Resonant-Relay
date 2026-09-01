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
    ]);
    const failed = [a,b,incoming,outgoing].find((result)=>result.error)?.error;
    if (!active) return;
    if (failed) {
      setState({ error: failed.message });
      return;
    }
    setState({
      contacts:[...(a.data??[]),...(b.data??[])].filter((row:any)=>row.other).sort((x,y)=>new Date(y.created_at).getTime()-new Date(x.created_at).getTime()),
      incoming:(incoming.data??[]).filter((row:any)=>row.sender),
      outgoing:(outgoing.data??[]).filter((row:any)=>row.recipient),
    });
  })(); return()=>{active=false}; },[]); if(!state)return <PageLoading />;
  if(state.error)return <div className="mx-auto max-w-2xl px-4 py-8 md:px-6"><PageHeader title="Contacts" /><div className="mt-6 rounded-md border border-border p-5"><p className="text-sm text-ink">Contacts could not load.</p><p className="mt-1 text-xs text-ink-faint">Reload the page to try again.</p><button type="button" onClick={()=>window.location.reload()} className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-canvas">Reload</button></div></div>;
  return <div className="mx-auto max-w-2xl px-4 py-8 md:px-6"><PageHeader title="Contacts" action={<AddPersonDialog />} /><RequestsList incoming={state.incoming} outgoing={state.outgoing} /><div className="mt-8"><h2 className="mb-3 text-sm font-medium text-ink-muted">{state.contacts.length===0?'No contacts yet':`${state.contacts.length} contact${state.contacts.length===1?'':'s'}`}</h2><ContactsList contacts={state.contacts} /></div></div>;
}
