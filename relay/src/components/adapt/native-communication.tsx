'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Adapt V communication primitives. Transport, permissions, attachments,
 * reactions, and stored messages stay in the original Relay controllers.
 * Only presentation is selected by the active ARROW identity.
 */
export const IDENTITIES = ['core','bloom','haven','atelier','pulse'] as const;
export type CommunicationIdentity = typeof IDENTITIES[number];
export function resolveCommunicationIdentity(value: unknown): CommunicationIdentity {
  return typeof value === 'string' && IDENTITIES.includes(value as CommunicationIdentity)
    ? value as CommunicationIdentity : 'core';
}
export function useCommunicationIdentity(): CommunicationIdentity {
  const [identity,setIdentity]=useState<CommunicationIdentity>('core');
  useEffect(()=>{
    const root=document.documentElement;
    const sync=()=>setIdentity(resolveCommunicationIdentity(root.dataset.arrowAdapt));
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(root,{attributes:true,attributeFilter:['data-arrow-adapt']});
    window.addEventListener('arrow:adaptchange',sync);
    return ()=>{observer.disconnect();window.removeEventListener('arrow:adaptchange',sync);};
  },[]);
  return identity;
}
export function NativeMessage({identity,mine,children,className='',style}:{
  identity:CommunicationIdentity;mine:boolean;children:ReactNode;className?:string;style?:CSSProperties;
}) {
  if(identity==='core') return <div className={className} style={style}>{children}</div>;
  const marker=mine?'YOU':'RELAY';
  const content=<div className={'relay-native-message-content '+className} style={style}>{children}</div>;
  switch(identity){
    case 'bloom':return <div className={'relay-native-bubble bloom '+(mine?'mine':'theirs')}>
      <span aria-hidden="true" className="relay-native-bubble-flower">✿</span>{content}
    </div>;
    case 'haven':return <div className={'relay-native-bubble haven '+(mine?'mine':'theirs')}>
      <span className="relay-native-bubble-folio" aria-hidden="true">{mine?'MY NOTE':'FROM A FRIEND'}</span>{content}
    </div>;
    case 'atelier':return <div className={'relay-native-bubble atelier '+(mine?'mine':'theirs')}>
      <span className="relay-native-bubble-issue" aria-hidden="true">{mine?'I.':'II.'}</span>
      <div className="relay-native-atelier-text">{content}</div>
    </div>;
    case 'pulse':return <div className={'relay-native-bubble pulse '+(mine?'mine':'theirs')}>
      <div className="relay-native-bubble-telemetry"><i aria-hidden="true"/>{marker} / MESSAGE</div>{content}
    </div>;
  }
}
export function NativeConversationRow({identity,active=false,children}:{
  identity:CommunicationIdentity;active?:boolean;children:ReactNode;
}) {
  if(identity==='core') return <div className="flex items-center gap-2 px-3 py-3 hover:bg-surface">{children}</div>;
  return <div data-native-conversation={identity}
    className={'relay-native-conversation-row '+identity+(active?' is-active':'')}>
    {identity==='bloom'&&<span aria-hidden="true" className="native-row-bloom-dot">✿</span>}
    {identity==='haven'&&<span aria-hidden="true" className="native-row-haven-rule"/>}
    {identity==='atelier'&&<span aria-hidden="true" className="native-row-atelier-arrow">↗</span>}
    {identity==='pulse'&&<span aria-hidden="true" className="native-row-pulse-beacon">◆</span>}
    <div className="relay-native-row-main">{children}</div>
  </div>;
}
export function NativeComposer({identity,children,replying=false}:{
  identity:CommunicationIdentity;children:ReactNode;replying?:boolean;
}) {
  if(identity==='core') return <>{children}</>;
  const caption={
    bloom:'A little note to send ✿',
    haven:'Write a message',
    atelier:'CORRESPONDENCE / COMPOSE',
    pulse:'RELAY / TRANSMISSION READY'
  }[identity];
  return <section className={'relay-native-composer '+identity+(replying?' has-reply':'')}>
    <div className="relay-native-composer-mast">
      {identity==='pulse'&&<i aria-hidden="true" className="relay-native-composer-light"/>}
      {identity==='bloom'&&<span aria-hidden="true">✿</span>}
      <span>{caption}</span>
      {identity==='atelier'&&<span aria-hidden="true" className="relay-native-composer-index">03 / SEND</span>}
    </div>
    <div className="relay-native-composer-stage">{children}</div>
  </section>;
}
/** Non-interactive message mock with the same component as live Relay messages. */
export function NativeMessagePreview({identity}: {identity:CommunicationIdentity}) {
  return <div className={'relay-native-message-preview preview-'+identity} aria-label={'Preview '+identity+' conversation'}>
    <NativeMessage identity={identity} mine={false}
      className="min-w-0 overflow-hidden rounded-2xl px-3 py-2 text-sm leading-5 bg-surface-raised text-ink">
      <p>RAVIN and Relay share one connected workspace.</p>
    </NativeMessage>
    <NativeMessage identity={identity} mine
      className="min-w-0 overflow-hidden rounded-2xl px-3 py-2 text-sm leading-5 bg-ink text-canvas">
      <p>{"Nice. What's next?"}</p>
    </NativeMessage>
  </div>;
}
