/* Embedded RAVIN quick chat for the integrated ARROW shell. */
(() => {
  'use strict';
  if (window.ArrowQuickRavin) return;
  const api='https://ravin-hyeq.onrender.com/api/chat';
  const S={el:null,owner:null,module:'orbit',conversation:null,busy:false,dock:null,push:false,
    float:{x:Math.max(12,innerWidth-500),y:Math.max(12,innerHeight-590),w:440,h:520},saved:null,gesture:null};
  const q=s=>S.el?.querySelector(s);
  const v=()=>({w:innerWidth,h:innerHeight});
  const clamp=(x,min,max)=>Math.max(min,Math.min(x,max));
  const still=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.arrowMotion==='reduce';
  function apply(){
    if(!S.el)return;
    const {w,h}=v(),r=S.float,d=S.dock;
    r.w=clamp(r.w,Math.min(300,w),Math.max(300,w-24));
    r.h=clamp(r.h,Math.min(320,h),Math.max(320,h-24));
    r.x=clamp(r.x,12,Math.max(12,w-r.w-12));
    r.y=clamp(r.y,12,Math.max(12,h-r.h-12));
    let left=r.x,top=r.y,width=r.w,height=r.h;
    if(d==='left'||d==='right'){width=Math.min(width,w);height=h;left=d==='left'?0:w-width;top=0;}
    if(d==='top'||d==='bottom'){width=w;height=Math.min(height,h);left=0;top=d==='top'?0:h-height;}
    Object.assign(S.el.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px'});
    S.el.dataset.docked=d||'none';
    document.documentElement.dataset.ravinDocked=S.el.hidden?'none':d||'none';
    document.documentElement.dataset.ravinLayout=S.push?'push':'overlay';
    document.documentElement.style.setProperty('--ravin-dock-width',width+'px');
    document.documentElement.style.setProperty('--ravin-dock-height',height+'px');
    q('[data-layout]').textContent=S.push?'Push':'Overlay';
    q('[data-layout]').setAttribute('aria-pressed',String(S.push));
    S.el.querySelectorAll('[data-dock]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.dock===d)));
  }
  function animateAttach(side){
    if(still())return;
    S.el.animate([{transform:'scale(1.015,.98)'},{transform:'scale(.991,1.013)',offset:.38},{transform:'scale(1)',offset:1}],{duration:560,easing:'cubic-bezier(.2,.8,.25,1)'});
    const wave=document.createElement('div');wave.className='arrow-quick-wave';wave.dataset.side=side;
    document.body.appendChild(wave);wave.addEventListener('animationend',()=>wave.remove(),{once:true});
    setTimeout(()=>wave.remove(),950);
    const page=document.querySelector('.orbit-app,.waypoint-app,.beta-experience');
    if(S.push&&page?.animate){
      const dx=side==='left'?10:side==='right'?-10:0,dy=side==='top'?8:side==='bottom'?-8:0;
      page.animate([{transform:'translate(0,0)'},{transform:'translate('+dx+'px,'+dy+'px)',offset:.28},{transform:'translate(0,0)'}],{duration:580,easing:'ease-out'});
    }
  }
  function attach(side){
    if(S.dock===side){S.dock=null;if(S.saved)S.float=S.saved;S.saved=null;apply();animateAttach(side);return;}
    if(!S.dock)S.saved={...S.float};
    S.dock=side;apply();animateAttach(side);
  }
  function message(role,txt){
    const el=document.createElement('div');el.className='arrow-quick-message '+(role==='user'?'user':'assistant');
    el.textContent=txt;q('.arrow-quick-messages').appendChild(el);
    q('.arrow-quick-messages').scrollTop=q('.arrow-quick-messages').scrollHeight;return el;
  }
  function reset(){
    if(S.busy)return;
    S.conversation=null;q('.arrow-quick-messages').replaceChildren();
    q('.arrow-quick-status').textContent='';
    message('assistant','How can I help?');
  }
  async function send(){
    if(S.busy)return;
    const input=q('.arrow-quick-input'),value=input.value.trim();if(!value)return;
    input.value='';message('user',value);
    const responseEl=message('assistant','');
    S.busy=true;q('.arrow-quick-send').disabled=true;
    q('.arrow-quick-status').textContent='RAVIN is replying…';
    const controller=new AbortController();
    S.controller=controller;
    try{
      const session=window.ArrowOS?.getSession?.();
      if(!session?.access_token)throw Error('Sign in to ARROW first.');
      if(S.owner&&S.owner!==session.user?.id)throw Error('Account changed. Start a new chat.');
      S.owner=session.user?.id||null;
      const fresh=session.expires_at*1000<Date.now()+30000&&window.ArrowOS?.refreshSession?
        await window.ArrowOS.refreshSession(session)||session:session;
      const res=await fetch('https://ravin-hyeq.onrender.com/api/v2/chat/stream',{
        method:'POST',
        signal:controller.signal,
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+fresh.access_token},
        body:JSON.stringify({message:value,mode:'conversation',surface:S.module,conversation_id:S.conversation})
      });
      if(!res.ok){
        const data=await res.json().catch(()=>({}));
        throw Error(data.error||'RAVIN is unavailable ('+res.status+').');
      }
      if(!res.body)throw Error('This browser cannot stream RAVIN responses.');
      const reader=res.body.getReader(),decoder=new TextDecoder();
      let pending='',done=false;
      while(true){
        const part=await reader.read();
        if(part.done)break;
        pending+=decoder.decode(part.value,{stream:true}).replace(/\r\n/g,'\n');
        let index;
        while((index=pending.indexOf('\n\n'))>=0){
          const frame=pending.slice(0,index);
          pending=pending.slice(index+2);
          const lines=frame.split('\n');
          const event=lines.find(line=>line.startsWith('event:'))?.slice(6).trim()||'message';
          const json=lines.filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
          let data={};try{data=JSON.parse(json);}catch{continue;}
          if(event==='token'){
            responseEl.textContent+=data.text||'';
            q('.arrow-quick-messages').scrollTop=q('.arrow-quick-messages').scrollHeight;
          }else if(event==='done'){
            if(!responseEl.textContent)responseEl.textContent=data.reply||'';
            S.conversation=data.conversation_id||S.conversation;
            done=true;
          }else if(event==='error'){
            throw Error(data.message||'RAVIN could not respond.');
          }
        }
      }
      if(!done)throw Error('RAVIN connection ended before the answer completed.');
      q('.arrow-quick-status').textContent='';
    }catch(e){
      if(e.name==='AbortError'){
        if(!responseEl.textContent)responseEl.textContent='Cancelled.';
      }else{
        if(responseEl.textContent)responseEl.textContent+='\n';
        responseEl.textContent+=e?.message||'Unable to reach RAVIN.';
        q('.arrow-quick-status').textContent='Connection issue';
      }
    }finally{
      S.busy=false;S.controller=null;q('.arrow-quick-send').disabled=false;
      if(!S.el.hidden)q('.arrow-quick-input').focus({preventScroll:true});
    }
  }
  function pointerDown(e,edge){
    if(e.button!==0)return;
    e.preventDefault();
    if(S.dock){
      const rect=S.el.getBoundingClientRect();
      S.float={x:rect.left,y:rect.top,w:Math.min(rect.width,Math.max(300,innerWidth-24)),h:Math.min(rect.height,Math.max(320,innerHeight-24))};
      S.dock=null;S.saved=null;apply();
    }
    S.gesture={id:e.pointerId,edge,x:e.clientX,y:e.clientY,last:e.clientX,lastY:e.clientY,rect:{...S.float}};
    S.el.classList.add('moving');
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e){
    const g=S.gesture;if(!g||e.pointerId!==g.id)return;
    const dx=e.clientX-g.x,dy=e.clientY-g.y,r={...g.rect},eName=g.edge;
    if(eName==='move'){r.x+=dx;r.y+=dy;
      const vx=e.clientX-g.last,vy=e.clientY-g.lastY;
      S.el.style.transform='skewX('+clamp(vx*-.18,-3.5,3.5)+'deg) skewY('+clamp(vy*-.11,-2,2)+'deg) scale('+clamp(1+Math.abs(vx)*.0005,1,1.018)+','+clamp(1-Math.abs(vx)*.0003,.988,1)+')';
    }else{
      if(eName.includes('e'))r.w=g.rect.w+dx;
      if(eName.includes('s'))r.h=g.rect.h+dy;
      if(eName.includes('w')){r.w=g.rect.w-dx;r.x=g.rect.x+dx;}
      if(eName.includes('n')){r.h=g.rect.h-dy;r.y=g.rect.y+dy;}
      r.w=clamp(r.w,Math.min(300,innerWidth),Math.max(300,innerWidth-24));
      r.h=clamp(r.h,Math.min(320,innerHeight),Math.max(320,innerHeight-24));
      if(eName.includes('w'))r.x=g.rect.x+g.rect.w-r.w;
      if(eName.includes('n'))r.y=g.rect.y+g.rect.h-r.h;
    }
    S.float=r;apply();g.last=e.clientX;g.lastY=e.clientY;
  }
  function pointerUp(e){
    if(!S.gesture||e.pointerId!==S.gesture.id)return;
    const wasDrag=S.gesture.edge==='move';S.gesture=null;S.el.classList.remove('moving');S.el.style.transform='';
    if(wasDrag){
      const r=S.float;
      if(r.x<44)return attach('left');
      if(r.x+r.w>innerWidth-44)return attach('right');
      if(r.y<44)return attach('top');
      if(r.y+r.h>innerHeight-44)return attach('bottom');
    }
    apply();if(!still())animateAttach('float');
  }
  function ensure(){
    if(S.el)return;
    S.el=document.createElement('section');S.el.className='arrow-quick-ravin';S.el.hidden=true;
    S.el.setAttribute('role','dialog');S.el.setAttribute('aria-modal','false');S.el.setAttribute('aria-label','RAVIN quick chat');
    S.el.innerHTML=
      '<header class="arrow-quick-head" data-move tabindex="0" aria-label="Drag to move RAVIN"><span class="arrow-quick-mark">✧</span><strong>RAVIN</strong><div class="arrow-quick-actions">'+
      '<button data-layout type="button" aria-pressed="false" title="Push page or overlay">Overlay</button><button data-new type="button" aria-label="New chat" title="New chat">＋</button>'+
      '<a data-full href="#" title="Full RAVIN" aria-label="Open full RAVIN">↗</a><button data-close type="button" title="Close" aria-label="Close RAVIN">×</button></div></header>'+
      '<div class="arrow-quick-docks" aria-label="Dock RAVIN"><button data-dock="top" type="button" aria-label="Dock top"></button><button data-dock="right" type="button" aria-label="Dock right"></button><button data-dock="bottom" type="button" aria-label="Dock bottom"></button><button data-dock="left" type="button" aria-label="Dock left"></button></div>'+
      '<div class="arrow-quick-messages" role="log" aria-live="polite"></div><form class="arrow-quick-compose"><textarea class="arrow-quick-input" rows="2" maxlength="8000" placeholder="Ask RAVIN…" aria-label="Message RAVIN"></textarea><div><span class="arrow-quick-status" role="status"></span><button class="arrow-quick-send" type="submit">Send ↗</button></div></form>'+
      '<div class="arrow-quick-resizers"><i data-resize="n"></i><i data-resize="e"></i><i data-resize="s"></i><i data-resize="w"></i><i data-resize="nw"></i><i data-resize="ne"></i><i data-resize="se"></i><i data-resize="sw"></i></div>';
    document.body.appendChild(S.el);
    q('[data-move]').addEventListener('pointerdown',e=>{if(e.target.closest('button,a'))return;pointerDown(e,'move');});
    S.el.querySelectorAll('[data-resize]').forEach(n=>n.addEventListener('pointerdown',e=>pointerDown(e,n.dataset.resize)));
    S.el.addEventListener('pointermove',pointerMove);
    S.el.addEventListener('pointerup',pointerUp);
    S.el.addEventListener('pointercancel',pointerUp);
    S.el.querySelectorAll('[data-dock]').forEach(b=>b.addEventListener('click',()=>attach(b.dataset.dock)));
    q('[data-layout]').addEventListener('click',()=>{S.push=!S.push;apply();animateAttach(S.dock||'float');});
    q('[data-close]').addEventListener('click',close);q('[data-new]').addEventListener('click',reset);
    q('.arrow-quick-compose').addEventListener('submit',e=>{e.preventDefault();void send();});
    q('.arrow-quick-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send();}});
    S.el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}});
    window.addEventListener('resize',apply,{passive:true});
    reset();
  }
  function open(module='orbit',prompt=''){
    ensure();const id=window.ArrowOS?.getSession?.()?.user?.id||null;
    if(id!==S.owner){S.owner=id;if(!S.busy)reset();}
    S.module=module;S.el.hidden=false;
    q('[data-full]').href=window.ArrowOS?.resolveHref?.('/ravin/')||'/ravin/';
    apply();animateAttach('float');if(prompt)q('.arrow-quick-input').value=prompt;q('.arrow-quick-input').focus({preventScroll:true});
  }
  function close(){if(!S.el)return;S.el.hidden=true;document.documentElement.dataset.ravinDocked='none';}
  window.ArrowQuickRavin={open,close};
})();