/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression tests. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function worker(clients=[],cache={add:async()=>{}}) {
  const handlers={};const calls=[];
  const self={location:{origin:'https://link9060.github.io'},registration:{scope:'https://link9060.github.io/Resonant-Relay/'},addEventListener:(type,handler)=>handlers[type]=handler,skipWaiting:()=>calls.push('active'),clients:{matchAll:async()=>clients,openWindow:async url=>calls.push(url)}};
  vm.runInNewContext(fs.readFileSync('public/sw.js','utf8'),{self,URL,caches:{open:async()=>cache}});
  return {handlers,calls};
}
test('push links open static chat details and leave Orbit windows alone',async()=>{
  const calls=[];
  const orbit={url:'https://link9060.github.io/Resonant-Relay/arrow/orbit/',focus:()=>assert.fail('Orbit hijacked'),navigate:()=>assert.fail('Orbit navigated')};
  const relay={url:'https://link9060.github.io/Resonant-Relay/space/',navigate:async url=>calls.push(url),focus:()=>calls.push('focused')};
  const w=worker([orbit,relay]);let pending;
  w.handlers.notificationclick({notification:{data:{link:'/chats/chat-id?from=push'},close(){}},waitUntil:promise=>{pending=promise;}});
  await pending;assert.deepEqual(calls,['https://link9060.github.io/Resonant-Relay/chats/view/?from=push&id=chat-id','focused']);
});
test('a missing optional icon does not break push worker installation',async()=>{
  const w=worker([],{add:async url=>{if(url.endsWith('.png')) throw new Error('icon offline');}});let pending;
  w.handlers.install({waitUntil:promise=>{pending=promise;}});await pending;assert.deepEqual(w.calls,['active']);
});
