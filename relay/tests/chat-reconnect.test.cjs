/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS component regression tests. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const {JSDOM}=require('jsdom');const dom=new JSDOM('<body></body>',{url:'https://example.org'});
global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
const React=require('react');const {createRoot}=require('react-dom/client');const {act}=React;
const message=(id,body=id)=>({id,body,conversation_id:'c',sender_id:'owner',created_at:'2026-10-11T12:00:00Z',edited_at:null,attachments:[],reply_to_id:null});
const snapshot=messages=>({messages,reactions:[],pins:[],oldest:messages[0]??null,hasOlder:false});
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
async function fixture(recover){
  const channels=[];const client={channel(name){const c={name,handlers:[],on(...args){c.handlers.push(args);return c;},subscribe(fn){c.status=fn;return c;}};channels.push(c);return c;},realtime:{setAuth:async()=>{}},removeChannel:async()=>{}};
  const empty=()=>null;const dependencies={
    '@/lib/chat-recovery':{recoverChat:recover},'@/lib/supabase/client':{createClient:()=>client},
    '@/components/chats/message-composer':{MessageComposer:empty},'@/components/user-role-badge':{UserRoleBadge:empty},'@/components/groups/leave-group-button':{LeaveGroupButton:empty},
    '@/lib/contact-colors':{contactColor:()=>'',contactDisplayName:p=>p.display_name},'@/lib/config':{appPageUrl:p=>p},'@/lib/actions/chats':{},'next/image':{default:empty},
    'lucide-react':new Proxy({},{get:()=>empty}),
  };
  const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/chats/message-thread.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:id=>dependencies[id]??require(id),window:dom.window,document:dom.window.document});
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
  await act(async()=>root.render(React.createElement(exports.MessageThread,{conversationId:'c',title:'Chat',isGroup:false,groupId:null,currentUserId:'owner',participantsById:{},preferencesById:{},rolesById:{},initialMessages:[message('a','original')],initialReactions:[],initialPinnedIds:[],initialMuted:false})));
  return {container,channels,close:async()=>{await act(async()=>root.unmount());container.remove();}};
}
test('subscription and reconnect replace stale rows, while a realtime event wins over an in-flight fetch',async()=>{
  const pending=deferred();let calls=0;
  const f=await fixture(async()=>{calls++;return calls===2?pending.promise:snapshot(calls===1?[message('a','edited')]:[message('a','edited'),message('b','missed during gap')]);});
  try {
    const channel=f.channels.find(c=>c.name==='messages:c');
    await act(async()=>channel.status('SUBSCRIBED'));
    assert.match(f.container.textContent,/edited/);assert.doesNotMatch(f.container.textContent,/original/);
    await act(async()=>channel.status('CHANNEL_ERROR'));assert.match(f.container.textContent,/Reconnecting/);
    await act(async()=>channel.status('SUBSCRIBED'));
    await act(async()=>channel.handlers.find(args=>args[1].event==='INSERT')[2]({new:message('b','missed during gap')}));
    await act(async()=>pending.resolve(snapshot([message('a','obsolete snapshot')])));
    assert.equal(calls,3);assert.match(f.container.textContent,/missed during gap/);assert.doesNotMatch(f.container.textContent,/obsolete snapshot/);
  } finally {await f.close();}
});
test('online resumes recovery and failures expose retry instead of clearing existing messages',async()=>{
  let calls=0;const f=await fixture(async()=>{calls++;if(calls===1)throw Error('offline');return snapshot([]);});
  try {
    await act(async()=>window.dispatchEvent(new window.Event('online')));
    assert.match(f.container.textContent,/original/);assert.match(f.container.textContent,/could not sync/);
    await act(async()=>[...f.container.querySelectorAll('button')].find(b=>b.textContent==='Retry sync').click());
    assert.equal(calls,2);assert.doesNotMatch(f.container.textContent,/original/);assert.match(f.container.textContent,/Say hi/);
  } finally {await f.close();}
  await act(async()=>window.dispatchEvent(new window.Event('online')));assert.equal(calls,2);
});
