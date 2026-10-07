import { createClient } from 'npm:@supabase/supabase-js@2.112.4';

const url = Deno.env.get('SUPABASE_URL')!;
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
const origins = new Set(['https://enterarrow.com','https://www.enterarrow.com','https://link9060.github.io','https://resonantrelay.org','https://www.resonantrelay.org']);
const admin = createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
const reply = (req: Request, body: unknown, status = 200) => new Response(status===204?null:JSON.stringify(body), {status, headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(req.headers.get('origin')||'')?req.headers.get('origin')!:'https://enterarrow.com','Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
async function bucket(value: string) {
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
Deno.serve(async req => {
  if(req.method==='OPTIONS') return reply(req,{},204);
  if(req.method!=='POST') return reply(req,{error:'Method not allowed.'},405);
  const origin=req.headers.get('origin');
  if(origin && !origins.has(origin))return reply(req,{error:'Origin not allowed.'},403);
  try {
    if(Number(req.headers.get('content-length')||0)>4096)return reply(req,{error:'Request too large.'},413);
    const text=await req.text();if(text.length>4096)return reply(req,{error:'Request too large.'},413);
    const body=JSON.parse(text);
    if (body.action === 'link_email' || body.action === 'verify_email') {
      const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
      const authenticated = token ? await admin.auth.getUser(token) : null;
      const user = authenticated?.data?.user;
      if (!user || authenticated?.error) return reply(req,{error:'Sign in to link recovery details.'},401);
      if (!user.email?.endsWith('@accounts.enterarrow.invalid')) return reply(req,{error:'Use the standard email change option for this account.'},400);
      const email=String(body.email||'').trim().toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||email.endsWith('.invalid'))return reply(req,{error:'Use a real personal email address.'},400);
      if(body.action==='link_email'){
        const rate=await admin.rpc('arrow_auth_rate_limit',{p_bucket:await bucket('email-link:'+user.id),p_limit:3});
        if(rate.error)throw Error('Unavailable');
        if(!rate.data)return reply(req,{error:'Too many verification requests. Try again in 15 minutes.'},429);
        const resend=Deno.env.get('RESEND_API_KEY');if(!resend)return reply(req,{error:'Verification email is temporarily unavailable.'},503);
        const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0');
        const challenge=await admin.rpc('arrow_email_challenge',{p_user:user.id,p_action:'start',p_email:email,p_hash:await bucket(user.id+':'+email+':'+code)});
        if(challenge.error)throw Error('Unavailable');
        const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+resend,'Content-Type':'application/json'},body:JSON.stringify({from:'ARROW <noreply@auth.resonantrelay.org>',to:[email],subject:'Verify your ARROW recovery email',text:`Your ARROW email verification code is ${code}. It expires in 10 minutes. Enter it in Settings while signed into the account that requested it. If you did not request this, ignore this email.`}),signal:AbortSignal.timeout(15000)});
        if(!sent.ok)return reply(req,{error:'Verification email could not be sent. Try again later.'},503);
        return reply(req,{ok:true});
      }
      if(!/^[0-9]{6}$/.test(String(body.code||'')))return reply(req,{error:'Enter the six-digit email code.'},400);
      const challenge=await admin.rpc('arrow_email_challenge',{p_user:user.id,p_action:'verify',p_email:email,p_hash:await bucket(user.id+':'+email+':'+body.code)});
      if(challenge.error)throw Error('Unavailable');
      if(!challenge.data)return reply(req,{error:'Code is incorrect or expired. Request a new code.'},400);
      const updated=await admin.auth.admin.updateUserById(user.id,{email:challenge.data,email_confirm:true});
      if(updated.error)return reply(req,{error:'That email could not be linked. It may already belong to another account.'},409);
      return reply(req,{ok:true});
    }
    const username=String(body.username||'').trim().replace(/^@/,'').toLowerCase();
    const password=body.password;
    if(!/^[a-z0-9_]{3,20}$/.test(username)||typeof password!=='string'||password.length>128)return reply(req,{error:'Use a username with 3–20 letters, numbers or underscores and a password under 129 characters.'},400);
    if(!['signup','login'].includes(body.action))return reply(req,{error:'Choose sign in or create account.'},400);
    const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',').at(-1)!.trim();
    for(const [value,limit] of [[`ip:${ip}`,30],[`name:${username}`,30]] as const){
      const result=await admin.rpc('arrow_auth_rate_limit',{p_bucket:await bucket(value),p_limit:limit});
      if(result.error)throw Error('Account service is temporarily unavailable.');
      if(!result.data)return reply(req,{error:'Too many attempts. Try again in 15 minutes.'},429);
    }
    const auth=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
    const identity=await admin.rpc('arrow_username_identity',{p_username:username});
    if(identity.error)throw Error('Account service is temporarily unavailable.');
    let email=identity.data?.email;
    if(body.action==='signup'){
      if(body.acceptTerms!==true)return reply(req,{error:'Accept the terms and privacy policy to create an account.'},400);
      if(password.length<12)return reply(req,{error:'Use at least 12 characters for your password.'},400);
      if(identity.data)return reply(req,{error:'That username is unavailable. Choose another.'},409);
      // Reserved names are checked separately from an absent identity.
      const reserved=await admin.schema('public').from('profiles').select('id').eq('username',username).maybeSingle();
      if(reserved.error)throw Error('Account service is temporarily unavailable.');
      if(reserved.data||['admin','administrator','owner','moderator','support','relay','arrow','ravin','orbit','atlas','waypoint','system','staff'].includes(username))return reply(req,{error:'That username is unavailable. Choose another.'},409);
      email=`${crypto.randomUUID()}@accounts.enterarrow.invalid`;
      const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{username,full_name:username}});
      if(created.error||!created.data.user)throw Error('Account could not be created. Try again.');
      const timestamp=new Date().toISOString();
      const profile=await admin.from('profiles').update({username,display_name:username,onboarding_completed_at:timestamp,terms_accepted_at:timestamp,privacy_acknowledged_at:timestamp}).eq('id',created.data.user.id).select('id').single();
      if(profile.error){await admin.auth.admin.deleteUser(created.data.user.id);return reply(req,{error:'That username is unavailable. Choose another.'},409);}
    }
    if(!email||identity.data?.banned)return reply(req,{error:'Username or password is incorrect.'},401);
    const result=await auth.auth.signInWithPassword({email,password});
    if(result.error||!result.data.session)return reply(req,{error:'Username or password is incorrect.'},401);
    return reply(req,{session:result.data.session});
  } catch {return reply(req,{error:'Account service is temporarily unavailable. Try again shortly.'},503);}
});
