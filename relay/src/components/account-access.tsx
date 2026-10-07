'use client';

import { createClient } from '@/lib/supabase/client';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, appPageUrl } from '@/lib/config';
import { FormEvent, useEffect, useState } from 'react';

export function AccountAccess() {
  const [email,setEmail]=useState('');
  const [pendingEmail,setPendingEmail]=useState('');
  const [emailCode,setEmailCode]=useState('');
  const [phone,setPhone]=useState('');
  const [password,setPassword]=useState('');
  const [code,setCode]=useState('');
  const [pendingPhone,setPendingPhone]=useState('');
  const [sms,setSms]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [recovery,setRecovery]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{let active=true;void createClient().auth.getUser().then(({data})=>{if(active && data.user){setRecovery(Boolean(data.user.email && !data.user.email.endsWith('@accounts.enterarrow.invalid')));setReady(true);}});void fetch(`${SUPABASE_URL}/auth/v1/settings`,{headers:{apikey:SUPABASE_PUBLISHABLE_KEY}}).then(r=>r.json()).then(s=>{if(active)setSms(s.external?.phone===true);}).catch(()=>{});return()=>{active=false;};},[]);
  async function update(event:FormEvent,kind:'email'|'emailverify'|'phone'|'password'|'verify') {
    event.preventDefault();if(busy || !ready)return;setBusy(true);setMessage('');
    const client=createClient();
    try {
      if ((kind === 'email' && !recovery) || kind === 'emailverify') {
        const {data,error}=await client.functions.invoke('arrow-account',{body:{action:kind==='emailverify'?'verify_email':'link_email',email:pendingEmail||email.trim().toLowerCase(),code:emailCode}});
        if(error || !data?.ok){const context=(error as {context?:Response}|null)?.context;const detail=await context?.json().catch(()=>null);throw Error(detail?.error||data?.error||'Email verification is unavailable.');}
        if(kind==='emailverify'){setRecovery(true);setPendingEmail('');setEmail('');setEmailCode('');await client.auth.refreshSession();setMessage('Recovery email verified and linked. Your username still works.');}
        else{setPendingEmail(email.trim().toLowerCase());setMessage('Check your email and enter the six-digit code below.');}
        return;
      }
      if(kind==='verify'){
        const {error}=await client.auth.verifyOtp({phone:pendingPhone,token:code.trim(),type:'phone_change'});if(error)throw error;
        setPendingPhone('');setCode('');setPhone('');setMessage('Phone verified and linked to this account.');return;
      }
      const value=kind==='email'?email.trim().toLowerCase():kind==='phone'?normalizePhone(phone):password;
      if(kind==='phone'&&!/^\+[1-9]\d{7,14}$/.test(value))throw Error('Use a mobile number with country code.');
      const {error}=await client.auth.updateUser({[kind]:value},kind==='email'?{emailRedirectTo:new URL(appPageUrl('/auth/callback'),location.origin).href}:undefined);
      if(error)throw error;
      if(kind==='phone'){setPendingPhone(value);setMessage('Enter the code sent to your phone to finish linking.');}
      else if(kind==='email'){setEmail('');setMessage('Check the new email for a verification link. Your username stays the same.');}
      else{setPassword('');setMessage('Password updated. Use your username and this password to sign in.');}
    }catch(error){setMessage(error instanceof Error?error.message:'Account changes could not be saved.');}
    finally{setBusy(false);}
  }
  return <section id="account-access" className="mt-8 scroll-mt-24 border-t border-border pt-6"><h2 className="text-base font-semibold text-ink">Sign-in and recovery</h2><p className="mt-2 text-sm text-ink-muted">Link a personal email or phone to your existing ARROW account. Your messages, tasks and username stay with you.</p>{ready&&!recovery&&<p className="mt-3 rounded-lg border border-amber-500/30 p-3 text-sm text-ink">No recovery email is linked. If you forget your password before adding one, account recovery may be unavailable.</p>}
    <form onSubmit={e=>void update(e,pendingEmail?'emailverify':'email')} className="mt-4 space-y-2"><label htmlFor="recovery-email" className="block text-sm text-ink-muted">Personal recovery email</label><input id="recovery-email" disabled={Boolean(pendingEmail)} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} className="profile-input" placeholder="you@example.com"/><button type="submit" disabled={busy || !ready} className="account-action">{pendingEmail?'Verify email':'Send verification email'}</button>{pendingEmail&&<><label htmlFor="email-code" className="block text-sm text-ink-muted">Email verification code</label><input id="email-code" className="profile-input" autoComplete="one-time-code" inputMode="numeric" required pattern="[0-9]{6}" value={emailCode} onChange={e=>setEmailCode(e.target.value.replace(/\D/g,'').slice(0,6))}/><button type="button" disabled={busy || !ready} className="account-action" onClick={()=>{setPendingEmail('');setEmailCode('');}}>Change email / request new code</button></>}</form>
    <form onSubmit={e=>void update(e,'password')} className="mt-5 space-y-2"><label htmlFor="account-password" className="block text-sm text-ink-muted">Set or change password</label><input id="account-password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className="profile-input" aria-describedby="password-hint"/><p id="password-hint" className="text-sm text-ink-faint">At least 12 characters. A few unrelated words work well.</p><button type="submit" disabled={busy || !ready} className="account-action">Save password</button></form>
    {sms?<form onSubmit={e=>void update(e,pendingPhone?'verify':'phone')} className="mt-5 space-y-2"><label htmlFor="account-phone" className="block text-sm text-ink-muted">{pendingPhone?'Verification code':'Mobile phone'}</label><input id="account-phone" type={pendingPhone?'text':'tel'} autoComplete={pendingPhone?'one-time-code':'tel'} inputMode={pendingPhone?'numeric':'tel'} required pattern={pendingPhone?'[0-9]{6}':undefined} value={pendingPhone?code:phone} onChange={e=>pendingPhone?setCode(e.target.value.replace(/\D/g,'').slice(0,6)):setPhone(e.target.value)} className="profile-input"/><button type="submit" disabled={busy || !ready} className="account-action">{pendingPhone?'Verify phone':'Send phone verification'}</button>{pendingPhone&&<button type="button" disabled={busy || !ready} onClick={()=>{setPendingPhone('');setCode('');}} className="account-action">Change number</button>}</form>:<p className="mt-5 text-sm text-ink-muted">Phone linking is unavailable while ARROW’s text-message service is disabled. Username and email sign-in remain available.</p>}
    <p role="status" aria-live="polite" className="mt-3 text-sm text-ink">{busy?'Saving…':message}</p>
  </section>;
}
export function normalizePhone(value:string){const raw=value.trim();const digits=raw.replace(/\D/g,'');return raw.startsWith('+')?'+'+digits:digits.length===10?'+1'+digits:digits.length===11&&digits.startsWith('1')?'+'+digits:'';}
