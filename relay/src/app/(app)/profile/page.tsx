'use client';

import { PageLoading } from '@/components/page-loading';
import { SignOutButton } from '@/components/profile/sign-out-button';
import { PushToggle } from '@/components/notifications/push-toggle';
import { createClient } from '@/lib/supabase/client';
import { formatRelayNumber } from '@/lib/utils';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function ProfilePage(){const[profile,setProfile]=useState<any>(null);useEffect(()=>{void(async()=>{const s=createClient();const{data:{user}}=await s.auth.getUser();if(user){const{data}=await s.from('profiles').select('*').eq('id',user.id).single();setProfile(data);}})();},[]);if(!profile)return <PageLoading/>;return <div className="mx-auto max-w-md px-4 py-8 md:px-6"><h1 className="font-display text-2xl font-medium tracking-tight text-ink">Profile</h1><div className="mt-6 flex items-center gap-4"><div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-xl font-medium text-ink">{profile.avatar_url?<Image src={profile.avatar_url} alt="" fill sizes="64px" className="object-cover" unoptimized/>:profile.display_name[0]?.toUpperCase()}</div><div><p className="text-lg font-medium text-ink">{profile.display_name}</p>{profile.school&&<p className="text-sm text-ink-muted">{profile.school}</p>}</div></div><div className="mt-8 rounded-md border border-border p-4"><p className="text-xs uppercase tracking-wide text-ink-faint">Your Relay Number</p><p className="mt-1 font-display text-3xl font-medium tracking-tight text-ink">{formatRelayNumber(profile.relay_number)}</p><p className="mt-2 text-xs text-ink-faint">Share this so people can add you. It doesn&apos;t reveal anything else about your account.</p></div><div className="mt-8"><p className="mb-2 text-xs uppercase tracking-wide text-ink-faint">Notifications</p><PushToggle/></div><div className="mt-8"><SignOutButton/></div></div>}
