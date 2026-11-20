/* ARROW release history and account-scoped one-time announcement. Browser-only. */
(() => {
  'use strict';
  if (window.ArrowWhatsNew) return;
  const BETA = location.hostname === 'link9060.github.io' && location.pathname.startsWith('/Resonant-Relay/');
  const PREFIX = BETA ? '/Resonant-Relay/arrow/' : '/';
  const AUTH_KEY = 'sb-cnorozrjugxpanpfmssa-auth-token';
  const AUTH_URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
  const ANON = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
  const META_FIELD = BETA ? 'arrow_whats_new_seen_beta' : 'arrow_whats_new_seen_public';
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.arrowMotion === 'reduce';
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, character => (
    {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]
  ));
  const model = {data:null,promise:null,modal:null,owner:null,checking:false,checkedId:null,dismissing:false,activeAbort:null};
  const centerRoute = () => BETA ? /\/Resonant-Relay\/(arrow\/(orbit|waypoint|atlas|ravin)\/|$)|\/Resonant-Relay\/(chats|contacts|planner|todo|calendar|notes|focus|schedule|space|$)/.test(location.pathname) :
    /^\/(orbit|relay|waypoint|atlas|ravin)(\/|$)/.test(location.pathname);
  const session = () => {
    const fromShell = window.ArrowOS?.getSession?.();
    if(fromShell?.user?.id && fromShell?.access_token)return fromShell;
    try {const saved=JSON.parse(localStorage.getItem(AUTH_KEY)||'null');return saved?.user?.id&&saved?.access_token?saved:null;}
    catch{return null;}
  };
  const seenKey = (userId,releaseId) => 'arrow-whats-new:'+META_FIELD+':'+userId+':'+releaseId;
  function load() {
    if(model.data)return Promise.resolve(model.data);
    if(!model.promise)model.promise=fetch(PREFIX+'arrow-release-log.json',{cache:'no-cache'})
      .then(response=>{if(!response.ok)throw Error('Release history unavailable.');return response.json();})
      .then(data=>{
        if(!data?.current?.id || !Array.isArray(data.history))throw Error('Invalid release history.');
        model.data=data;return data;
      }).catch(error=>{model.promise=null;throw error;});
    return model.promise;
  }
  function groups(release) {
    return (release.groups||[]).map(group=>
      '<section class="arrow-release-group"><h3>'+escapeHtml(group.label)+'</h3><ul>'+
      (group.items||[]).map(item=>'<li>'+escapeHtml(item)+'</li>').join('')+'</ul></section>'
    ).join('');
  }
  function releaseHistory(data) {
    return '<div class="arrow-release-list"><h3>Previous updates</h3>'+
      data.history.map(item=>
        '<details><summary><span>'+escapeHtml(item.title)+'</span><small>'+escapeHtml(item.version)+'</small></summary>'+
        '<div class="arrow-release-past"><p>'+escapeHtml(item.summary)+'</p>'+groups(item)+'</div></details>'
      ).join('')+'</div>';
  }
  async function renderInto(host) {
    if(!host)return;
    host.innerHTML='<p class="arrow-release-loading" role="status">Loading updates…</p>';
    try{
      const data=await load();
      if(!host.isConnected)return;
      const release=data.current;
      host.innerHTML='<div class="arrow-release-panel">'+
        '<div class="arrow-release-feature"><span>ARROW / '+escapeHtml(release.version)+'</span>'+
        '<h2>'+escapeHtml(release.title)+'</h2><p>'+escapeHtml(release.summary)+'</p></div>'+
        groups(release)+releaseHistory(data)+'</div>';
    }catch{
      if(host.isConnected)host.innerHTML='<p class="arrow-release-loading" role="alert">Updates are unavailable. Try reopening What’s New.</p>';
    }
  }
  function restoreFocus() {
    const target=document.querySelector('[data-arrow-panel="whatsnew"]');
    if(target instanceof HTMLElement)target.focus({preventScroll:true});
  }
  function removeModal() {
    if(!model.modal)return;
    const modal=model.modal;model.modal=null;
    modal.remove();
    document.documentElement.classList.remove('arrow-release-modal-open');
  }
  function effectTile() {
    const tile=document.querySelector('[data-arrow-panel="whatsnew"]');
    if(!tile)return;
    tile.classList.remove('arrow-release-received');
    void tile.offsetWidth;
    tile.classList.add('arrow-release-received');
    tile.addEventListener('animationend',()=>tile.classList.remove('arrow-release-received'),{once:true});
  }
  async function absorb(card) {
    const origin=card.getBoundingClientRect();
    const cx=origin.left+origin.width/2, cy=origin.top+origin.height/2;
    if(reduced()){removeModal();window.ArrowOS?.openTray?.();restoreFocus();return;}
    try{
      await card.animate([
        {opacity:1,transform:'scale(1)',borderRadius:'20px'},
        {opacity:.95,transform:'scale(.26)',borderRadius:'44%'},
        {opacity:0,transform:'scale(.025)',borderRadius:'50%'}
      ],{duration:380,easing:'cubic-bezier(.4,0,.3,1)',fill:'forwards'}).finished;
    }catch{ /* animation cancellation still permits dismissal */ }
    removeModal();
    const dot=document.createElement('span');
    dot.className='arrow-release-flight-dot';
    dot.setAttribute('aria-hidden','true');
    dot.style.left=cx+'px';dot.style.top=cy+'px';
    document.body.append(dot);
    window.ArrowOS?.openTray?.();
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const target=document.querySelector('[data-arrow-panel="whatsnew"]');
    const box=target?.getBoundingClientRect();
    if(!box || box.width===0 || box.height===0){dot.remove();restoreFocus();return;}
    const dx=box.left+box.width/2-cx,dy=box.top+box.height/2-cy;
    const swing=dx>=0?36:-36;
    try {
      await dot.animate([
        {transform:'translate(-50%,-50%) scale(1)',opacity:1},
        {transform:'translate(calc(-50% + '+(dx*.5+swing)+'px),calc(-50% + '+(dy*.3-32)+'px)) scale(1.25)',opacity:1,offset:.48},
        {transform:'translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px)) scale(.1)',opacity:.6}
      ],{duration:680,easing:'cubic-bezier(.18,.8,.24,1)',fill:'forwards'}).finished;
    }catch{}
    dot.remove();effectTile();restoreFocus();
  }
  async function markSeen(userId,id) {
    try{localStorage.setItem(seenKey(userId,id),'1');}catch{}
    try{
      const auth=session();
      if(!auth || auth.user.id!==userId)return;
      const response=await fetch(AUTH_URL+'/auth/v1/user',{
        method:'PUT',
        headers:{'Content-Type':'application/json',apikey:ANON,Authorization:'Bearer '+auth.access_token},
        body:JSON.stringify({data:{[META_FIELD]:id}})
      });
      if(!response.ok)throw Error('Could not sync seen release.');
    }catch{ /* browser-scoped fallback; will retry when user opens next time */ }
    try{new BroadcastChannel('arrow-release-notice').postMessage({id,userId});}catch{}
  }
  function dismiss() {
    if(!model.modal || model.dismissing)return;
    model.dismissing=true;
    const current=model.data?.current;
    const owner=model.owner;
    if(owner&&current)void markSeen(owner,current.id);
    const card=model.modal.querySelector('.arrow-release-modal-card');
    model.modal.querySelectorAll('button').forEach(button=>button.disabled=true);
    void absorb(card).finally(()=>{model.dismissing=false;});
  }
  async function show(auto=false) {
    if(model.modal || model.dismissing)return;
    const data=await load();
    if(model.modal || model.dismissing)return;
    const current=data.current;
    const root=document.createElement('div');
    root.className='arrow-release-overlay';
    root.setAttribute('role','dialog');
    root.setAttribute('aria-modal','true');
    root.setAttribute('aria-labelledby','arrow-whats-new-title');
    root.innerHTML=
      '<div class="arrow-release-backdrop" aria-hidden="true"></div>'+
      '<section class="arrow-release-modal-card" tabindex="-1">'+
        '<header><div><span class="arrow-release-kicker">WHAT’S NEW / '+escapeHtml(current.version)+'</span>'+
        '<h2 id="arrow-whats-new-title">'+escapeHtml(current.title)+'</h2>'+
        '<p>'+escapeHtml(current.summary)+'</p></div>'+
        '<button type="button" data-arrow-release-close aria-label="Close What’s New">×</button></header>'+
        '<div class="arrow-release-modal-scroll">'+groups(current)+releaseHistory(data)+'</div>'+
        '<footer><button type="button" data-arrow-release-close>Got it</button></footer>'+
      '</section>';
    document.body.appendChild(root);
    model.modal=root;document.documentElement.classList.add('arrow-release-modal-open');
    root.querySelectorAll('[data-arrow-release-close]').forEach(button=>button.addEventListener('click',dismiss));
    root.querySelector('.arrow-release-backdrop').addEventListener('click',dismiss);
    const modalCard=root.querySelector('.arrow-release-modal-card');
    modalCard.focus({preventScroll:true});
    root.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();dismiss();return;}
      if(event.key!=='Tab')return;
      const nodes=[...root.querySelectorAll('button:not([disabled]),summary,[tabindex="0"]')].filter(node=>node.getBoundingClientRect().width);
      if(!nodes.length)return;
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    });
    if(auto)root.dataset.automatic='true';
  }
  async function checkOnce() {
    if(model.checking || model.modal || !centerRoute())return;
    const auth=session();if(!auth?.user?.id)return;
    const owner=auth.user.id;
    if(model.checkedId===owner)return;
    model.checking=true;
    try{
      const data=await load(),id=data.current.id;
      if(model.checkedId===owner)return;
      const key=seenKey(owner,id);
      try{if(localStorage.getItem(key)==='1'){model.checkedId=owner;return;}}catch{}
      const response=await fetch(AUTH_URL+'/auth/v1/user',{
        method:'GET',headers:{apikey:ANON,Authorization:'Bearer '+auth.access_token},
        signal:AbortSignal.timeout(10000)
      });
      if(response.status===401)return;
      if(response.ok){
        const user=await response.json();
        if(user?.id!==owner)return;
        if(user?.user_metadata?.[META_FIELD]===id){
          try{localStorage.setItem(key,'1');}catch{}
          model.checkedId=owner;return;
        }
      }
      if(session()?.user?.id!==owner)return;
      model.owner=owner;model.checkedId=owner;
      await show(true);
    }catch{ /* no network: leave accessible via the ARROW tile */ }
    finally{model.checking=false;}
  }
  function bootstrap() {
    if(!centerRoute())return;
    let tries=0;
    const attempt=()=>{
      if(model.checkedId || model.modal)return;
      void checkOnce();
      if(tries++<18)setTimeout(attempt,850);
    };
    setTimeout(attempt,800);
    window.addEventListener('focus',()=>{if(!model.checkedId)void checkOnce();});
    window.addEventListener('storage',event=>{
      if(event.key===AUTH_KEY){model.checkedId=null;model.owner=null;removeModal();setTimeout(()=>void checkOnce(),500);}
      if(event.key?.startsWith('arrow-whats-new:') && model.modal){
        const auth=session(),current=model.data?.current;
        if(auth?.user?.id&&current&&event.key===seenKey(auth.user.id,current.id)&&event.newValue==='1')removeModal();
      }
    });
    try{
      const bc=new BroadcastChannel('arrow-release-notice');
      bc.addEventListener('message',event=>{
        const auth=session();
        if(event.data?.userId===auth?.user?.id&&event.data?.id===model.data?.current?.id){
          model.checkedId=auth.user.id;if(model.modal&&!model.dismissing)removeModal();
        }
      });
    }catch{}
  }
  window.ArrowWhatsNew={renderInto,open:()=>show(false),checkOnce};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap,{once:true});
  else bootstrap();
})();