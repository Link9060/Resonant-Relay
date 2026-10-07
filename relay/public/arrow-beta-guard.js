(() => {
  if (location.hostname !== 'link9060.github.io' || !location.pathname.startsWith('/Resonant-Relay/arrow/')) return;
  const entry='/Resonant-Relay/login/';
  const storage='sb-cnorozrjugxpanpfmssa-auth-token';
  const base='https://cnorozrjugxpanpfmssa.supabase.co';
  const key='sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
  const returnTo=location.href;
  const login=()=>{try{localStorage.setItem('arrow-post-auth-url-v1',returnTo);}catch{}location.replace(entry);};
  document.documentElement.style.visibility='hidden';
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  void (async()=>{
    try {
      let session=JSON.parse(localStorage.getItem(storage)||'null');
      if(!session?.access_token){login();return;}
      if(session.refresh_token && Number(session.expires_at)*1000<Date.now()+30000){
        const refreshed=await fetch(base+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:key,'content-type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token}),signal:controller.signal});
        if(!refreshed.ok){login();return;}const fresh=await refreshed.json();const current=JSON.parse(localStorage.getItem(storage)||'null');if(current?.refresh_token!==session.refresh_token){login();return;}session={...session,...fresh};localStorage.setItem(storage,JSON.stringify(session));
      }
      const headers={apikey:key,Authorization:'Bearer '+session.access_token,'content-type':'application/json'};
      const user=await fetch(base+'/auth/v1/user',{headers,signal:controller.signal});if(user.status===401||user.status===403){login();return;}if(!user.ok)throw Error('Account verification failed.');
      const access=await fetch(base+'/rest/v1/rpc/beta_access_status',{method:'POST',headers,body:'{}',signal:controller.signal});if(!access.ok)throw Error('Beta access could not be checked.');
      const status=await access.json();if(!status?.approved){location.replace('/Resonant-Relay/beta-access/');return;}
      document.documentElement.style.visibility='';
    }catch{
      if (!document.body) await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, {once:true}));
      const main=document.createElement('main');main.style.cssText='max-width:560px;margin:10vh auto;padding:24px;font:16px system-ui;line-height:1.6';
      const heading=document.createElement('h1');heading.textContent='ARROW Beta could not verify your session';
      const copy=document.createElement('p');copy.textContent='Check your connection, then refresh. Your account data has not been changed.';
      const link=document.createElement('a');link.href=entry;link.textContent='Return to beta sign in';main.append(heading,copy,link);document.body.replaceChildren(main);document.documentElement.style.visibility='';
    }finally{clearTimeout(timer);}
  })();
})();

