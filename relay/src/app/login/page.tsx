'use client';
import { createClient } from '@/lib/supabase/client';
import { normalizePhone } from '@/components/account-access';
import { appPageUrl, BASE_PATH, IS_BETA, SUPABASE_PUBLISHABLE_KEY as KEY, SUPABASE_URL as URL } from '@/lib/config';
import { FormEvent, useEffect, useState } from 'react';

export default function LoginPage(){
  const [method,setMethod]=useState<'account'|'email'|'phone'>('account');
  const [signup,setSignup]=useState(false);
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [showPassword,setShowPassword]=useState(false);
  const [accepted,setAccepted]=useState(false);
  const [email,setEmail]=useState('');
  const [phone,setPhone]=useState('');
  const [pendingPhone,setPendingPhone]=useState('');
  const [code,setCode]=useState('');
  const [providers,setProviders]=useState<{google:boolean;phone:boolean}|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [cooldown,setCooldown]=useState(0);
  const callback=()=>new globalThis.URL(appPageUrl('/auth/callback'),location.origin).href;
  const finish=()=>location.replace(callback());
  useEffect(()=>{
    let active=true;
    const next=new URLSearchParams(location.search).get('next');
    if(next?.startsWith(`${BASE_PATH}/`)&&!next.startsWith('//')){try{localStorage.setItem('relay-post-auth-next',next);}catch{}}
    void fetch(`${URL}/auth/v1/settings`,{headers:{apikey:KEY},signal:AbortSignal.timeout(10000)}).then(r=>r.ok?r.json():null).then(s=>{if(active)setProviders({google:s?.external?.google===true,phone:s?.external?.phone===true});}).catch(()=>{if(active)setProviders({google:false,phone:false});});
    return()=>{active=false;};
  },[]);
  useEffect(()=>{if(!cooldown)return;const timer=setTimeout(()=>setCooldown(Math.max(0,cooldown-1)),1000);return()=>clearTimeout(timer);},[cooldown]);
  async function submit(event:FormEvent){
    event.preventDefault();if(busy)return;setBusy(true);setMessage('');
    const client=createClient();
    try{
      if(method==='account'){
        const response=await fetch(`${URL}/functions/v1/arrow-account`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({action:signup?'signup':'login',username:username.trim().toLowerCase(),password,acceptTerms:accepted}),signal:AbortSignal.timeout(20000)});
        const result=await response.json();if(!response.ok||!result.session)throw Error(result.error||'Sign-in could not finish.');
        const {error}=await client.auth.setSession(result.session);if(error)throw error;setPassword('');finish();
      }else if(method==='email'){
        if(cooldown)throw Error(`Wait ${cooldown} seconds before requesting another email.`);
        const branded=await client.functions.invoke('auth-email',{body:{email:email.trim().toLowerCase()}});
        if(branded.error){
          const context=(branded.error as {context?:Response}).context;
          if(context?.status===429){setCooldown(60);throw Error('Too many email requests. Try again in one minute.');}
          const {error}=await client.auth.signInWithOtp({email:email.trim().toLowerCase(),options:{emailRedirectTo:callback()}});if(error)throw error;
        }
        setCooldown(60);setMessage('Sign-in link sent. Open the newest email in this browser.');
      }else{
        if(pendingPhone){const {data,error}=await client.auth.verifyOtp({phone:pendingPhone,token:code,type:'sms'});if(error||!data.session)throw error||Error('Verification did not finish.');finish();}
        else{
          if(cooldown)throw Error(`Wait ${cooldown} seconds before requesting another text.`);
          const normalized=normalizePhone(phone);if(!/^\+[1-9]\d{7,14}$/.test(normalized))throw Error('Use a valid mobile number with country code.');
          const {error}=await client.auth.signInWithOtp({phone:normalized});if(error)throw error;setPendingPhone(normalized);setCooldown(60);setMessage('Enter the 6-digit code sent to your phone.');
        }
      }
    }catch(error){setMessage(error instanceof Error?error.message:'Sign-in is unavailable. Try again.');}
    finally{setBusy(false);}
  }
  async function google(){
    if(busy)return;setBusy(true);setMessage('');
    try{const {error}=await createClient().auth.signInWithOAuth({provider:'google',options:{redirectTo:callback(),scopes:'openid email profile',queryParams:{prompt:'select_account'}}});if(error)throw error;}
    catch(error){setMessage(error instanceof Error?error.message:'Google sign-in is unavailable.');setBusy(false);}
  }
  function changeMethod(value:typeof method){setMethod(value);setMessage('');}
  return <main className="auth-page min-h-screen bg-canvas px-5 py-10"><div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-surface p-6 sm:p-8"><p className="text-sm font-medium tracking-widest text-ink-muted">ARROW {IS_BETA?'BETA':''}</p><h1 className="mt-3 font-display text-3xl font-medium text-ink">{signup&&method==='account'?'Create your account':'Welcome back'}</h1><p className="mt-2 text-sm text-ink-muted">One account for Orbit, Relay, RAVIN, Atlas and Waypoint.</p>
    <div className="auth-methods mt-6" aria-label="Sign-in method">{(['account','email','phone'] as const).map(value=><button type="button" key={value} disabled={busy} aria-pressed={method===value} onClick={()=>changeMethod(value)}>{value==='account'?'Username':value==='email'?'Email':'Phone'}</button>)}</div>
    {method==='phone'&&!providers?.phone?<p role="status" className="mt-5 text-sm text-ink-muted">{providers?'Text-message sign-in is unavailable. Use username or email.':'Checking phone sign-in availability…'}</p>:<form onSubmit={submit} className="mt-5 space-y-4" aria-busy={busy}>
      {method==='account'&&<><div className="auth-methods"><button type="button" disabled={busy} aria-pressed={!signup} onClick={()=>{setSignup(false);setMessage('');}}>Sign in</button><button type="button" disabled={busy} aria-pressed={signup} onClick={()=>{setSignup(true);setMessage('');}}>Create account</button></div><label className="block text-sm text-ink-muted" htmlFor="username">Username</label><input className="profile-input" id="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]{3,20}" value={username} onChange={e=>setUsername(e.target.value)} aria-describedby="username-help"/><p id="username-help" className="text-sm text-ink-faint">3–20 letters, numbers or underscores.</p><label className="block text-sm text-ink-muted" htmlFor="password">Password</label><div className="flex gap-2"><input className="profile-input min-w-0" id="password" type={showPassword?'text':'password'} autoComplete={signup?'new-password':'current-password'} required minLength={signup?12:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/><button className="account-action" type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'} aria-pressed={showPassword}>{showPassword?'Hide':'Show'}</button></div>{signup?<><p className="text-sm text-ink-muted">Use at least 12 characters. No email or phone required; add recovery details in Settings later.</p><label className="flex items-start gap-2 text-sm text-ink-muted"><input type="checkbox" required checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-1"/><span>I agree to the <a className="underline" href={appPageUrl('/terms')}>terms</a> and acknowledge the <a className="underline" href={appPageUrl('/privacy')}>privacy policy</a>.</span></label></>:<button className="text-sm text-ink-muted underline" type="button" onClick={()=>{changeMethod('email');setMessage('Use your linked recovery email to sign in, then change your password in Settings.');}}>Forgot password?</button>}</>}
      {method==='email'&&<><p className="rounded-lg border border-border p-3 text-sm text-ink-muted">Use a personal email. School or work administrators may restrict access to managed accounts.</p><label className="block text-sm text-ink-muted" htmlFor="email">Personal email</label><input className="profile-input" id="email" type="email" autoComplete="email" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)}/></>}
      {method==='phone'&&<><label className="block text-sm text-ink-muted" htmlFor="phone">{pendingPhone?`Code sent to ${pendingPhone}`:'Mobile number'}</label><input className="profile-input" id="phone" type={pendingPhone?'text':'tel'} inputMode={pendingPhone?'numeric':'tel'} autoComplete={pendingPhone?'one-time-code':'tel'} required pattern={pendingPhone?'[0-9]{6}':undefined} value={pendingPhone?code:phone} onChange={e=>pendingPhone?setCode(e.target.value.replace(/\D/g,'').slice(0,6)):setPhone(e.target.value)} placeholder={pendingPhone?'123456':'+1 555 123 4567'}/>{pendingPhone&&<button className="account-action" type="button" disabled={busy} onClick={()=>{setPendingPhone('');setCode('');}}>Change number</button>}</>}
      <button type="submit" className="account-action auth-submit w-full" disabled={busy||(method==='email'&&cooldown>0)||(method==='phone'&&!pendingPhone&&cooldown>0)}>{busy?'Please wait…':method==='account'?(signup?'Create ARROW account':'Sign in to ARROW'):method==='email'?(cooldown?`Try again in ${cooldown}s`:'Email a sign-in link'):pendingPhone?'Verify and sign in':cooldown?`Try again in ${cooldown}s`:'Text a sign-in code'}</button>
    </form>}
    <p role="status" aria-live="polite" className="mt-4 text-sm text-ink">{message}</p>
    {providers?.google&&<button type="button" className="account-action mt-4 w-full" onClick={()=>void google()} disabled={busy}>Continue with Google</button>}
    {IS_BETA&&<p className="mt-5 text-sm text-ink-muted">Beta access requires approval after you sign in. <a href={appPageUrl('/beta-access')} className="underline">Request access</a>.</p>}
    <p className="mt-5 text-sm text-ink-faint">By continuing, you agree to the <a href={appPageUrl('/terms')} className="underline">terms</a> and acknowledge the <a href={appPageUrl('/privacy')} className="underline">privacy policy</a>.</p>
  </div></main>;
}
