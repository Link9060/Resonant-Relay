'use client';

import { PageLoading } from '@/components/page-loading';
import { appUrl } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Suspense,useEffect,useState } from 'react';

function Callback(){const params=useSearchParams();const[error,setError]=useState<string|null>(null);useEffect(()=>{void(async()=>{const s=createClient();const code=params.get('code');if(!code){setError('Missing sign-in code.');return;}const{data,error}=await s.auth.exchangeCodeForSession(code);if(error||!data.session){setError('Sign-in failed. Please try again.');return;}window.location.replace(`${window.location.origin}${appUrl('/')}`);})()},[params]);return error?<main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center"><div><p className="text-sm text-red-500">{error}</p><a href={appUrl('/login/')} className="mt-4 inline-block text-sm text-ink underline">Back to sign in</a></div></main>:<PageLoading label="Finishing sign in…"/>}
export default function AuthCallbackPage(){return <Suspense fallback={<PageLoading/>}><Callback/></Suspense>}
