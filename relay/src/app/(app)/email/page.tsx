'use client';

import { ConnectGoogleButton } from '@/components/google/connect-button';
import { DisconnectGoogleButton } from '@/components/google/disconnect-button';
import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { EmailMessageList } from '@/components/google/email-message-list';
import { createClient } from '@/lib/supabase/client';
import { useEffect,useState } from 'react';

export default function EmailPage(){const[state,setState]=useState<any>(null);useEffect(()=>{void(async()=>{const s=createClient();const{data:status,error}=await s.functions.invoke('google-hub',{body:{action:'status',service:'gmail'}});if(error||!status?.connected){setState({connected:false,messages:[],loadError:false});return;}const r=await s.functions.invoke('google-hub',{body:{action:'gmail_messages',service:'gmail'}});setState({connected:true,messages:r.data?.messages??[],loadError:!!r.error});})()},[]);if(!state)return <PageLoading/>;return <div className="mx-auto max-w-2xl px-4 py-8 md:px-6"><PageHeader title="Email" subtitle="The school email that actually needs your attention." action={state.connected?<DisconnectGoogleButton service="gmail"/>:<ConnectGoogleButton service="gmail" next="/email"/>}/>{!state.connected?<div className="mt-8 rounded-md border border-dashed border-border py-10 text-center"><p className="text-sm text-ink-muted">Connect Gmail to see your inbox here.</p><p className="mt-1 text-xs text-ink-faint">Read-only — Relay never sends email without asking.</p></div>:<div className="mt-6">{state.loadError?<p className="text-sm text-red-500">Couldn&apos;t load your inbox right now.</p>:state.messages.length===0?<p className="text-sm text-ink-faint">Inbox is empty.</p>:<EmailMessageList messages={state.messages} />}</div>}</div>}
