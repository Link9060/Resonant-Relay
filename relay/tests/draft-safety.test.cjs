/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS component regression tests. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<html><body></body></html>',{url:'https://example.org/'});
global.window=dom.window;global.document=dom.window.document;global.HTMLElement=dom.window.HTMLElement;
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react');
const {createRoot}=require('react-dom/client');
const {act}=React;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const props=element=>element[Object.keys(element).find(key=>key.startsWith('__reactProps$'))];
function component(file,dependencies) {
  const exports={};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,require:id=>id==='lucide-react'?new Proxy({},{get:()=>()=>null}):dependencies[id]??require(id),window:dom.window,console,setTimeout,clearTimeout});
  return exports;
}
async function mount(Component,componentProps={}) {
  const container=document.createElement('div');document.body.append(container);const root=createRoot(container);
  await act(async()=>{root.render(React.createElement(Component,componentProps));await delay(15);});
  await act(async()=>{await delay(15);});
  return {container,close:async()=>{await act(async()=>root.unmount());container.remove();}};
}
const note=id=>({id,title:id,content:[{id:'block-'+id,type:'paragraph',text:'original'}],is_pinned:false,updated_at:'2026-10-07T12:00:00Z'});
async function notesFixture(save,restore=false) {
  if(!restore) window.sessionStorage.clear();
  const actions={updateNote:save,newNoteBlock:()=>({id:'new',type:'paragraph',text:''})};
  const chain={select:()=>chain,eq:()=>chain,order:()=>chain,then:resolve=>Promise.resolve({data:[note('A'),note('B')],error:null}).then(resolve)};
  const client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:()=>chain};
  const {NotesWorkspace}=component('src/components/notes/notes-workspace.tsx',{'@/lib/actions/notes':actions,'@/lib/supabase/client':{createClient:()=>client}});
  return mount(NotesWorkspace);
}
async function edit(container,text) {await act(async()=>props(container.querySelector('textarea')).onChange({target:{value:text}}));}
test('a slow note save cannot overwrite newer typing or mark it saved',async()=>{
  const writes=[];const pending=deferred();
  const f=await notesFixture(async(id,title,content)=>{writes.push(content[0].text);return pending.promise;});
  try {
    await edit(f.container,'first');await act(async()=>{await delay(750);});
    assert.deepEqual(writes,['first']);await edit(f.container,'second');
    await act(async()=>pending.resolve({ok:true,data:{...note('A'),content:[{...note('A').content[0],text:'first'}]}}));
    assert.equal(f.container.querySelector('textarea').value,'second');
    assert.doesNotMatch(f.container.textContent,/Saved/);
  } finally {await f.close();}
});
test('switching notes preserves and saves edits to both notes',async()=>{
  const writes=[];
  const f=await notesFixture(async(id,title,content)=>{writes.push([id,content[0].text]);return {ok:true,data:{...note(id),content}};});
  try {
    await edit(f.container,'A edit');
    const b=[...f.container.querySelectorAll('aside button')].find(button=>button.textContent.startsWith('B'));
    await act(async()=>props(b).onClick());await edit(f.container,'B edit');
    await act(async()=>{await delay(750);});
    assert.ok(writes.some(([id,text])=>id==='A'&&text==='A edit'));
    assert.ok(writes.some(([id,text])=>id==='B'&&text==='B edit'));
  } finally {await f.close();}
});
test('failed note saves keep the draft and provide a retry',async()=>{
  const f=await notesFixture(async()=>({ok:false,error:'Connection failed'}));
  try {await edit(f.container,'keep me');await act(async()=>{await delay(750);});assert.equal(f.container.querySelector('textarea').value,'keep me');assert.match(f.container.textContent,/Retry saving/);}
  finally {await f.close();}
});
async function composerFixture(send,status=async()=>({data:[{can_send:true}],error:null})) {
  const {MessageComposer}=component('src/components/chats/message-composer.tsx',{'@/lib/actions/chats':{sendMessage:send},'@/lib/config':{appPageUrl:path=>path},'@/lib/supabase/client':{createClient:()=>({rpc:status})}});
  return mount(MessageComposer,{conversationId:'conversation'});
}
test('failed message sends preserve drafts and release the send control',async()=>{
  const pending=deferred();let count=0;
  const f=await composerFixture(()=>{count++;return pending.promise;});
  try {
    const input=f.container.querySelector('input:not([type=file])');
    await act(async()=>props(input).onChange({target:{value:'keep my draft'}}));
    const send=f.container.querySelector('[aria-label=Send]');
    await act(async()=>{props(send).onClick();props(send).onClick();});
    assert.equal(count,1);assert.equal(input.value,'keep my draft');assert.equal(input.disabled,true);
    await act(async()=>pending.reject(new Error('offline')));
    assert.equal(input.value,'keep my draft');assert.equal(input.disabled,false);assert.match(f.container.textContent,/draft is still here/);
  } finally {await f.close();}
});
test('an authentication status rejection ends checking and prevents sending',async()=>{
  const f=await composerFixture(()=>assert.fail('permission failure sent a message'),async()=>{throw new Error('offline');});
  try {assert.match(f.container.textContent,/permission could not be verified/);assert.equal(f.container.querySelector('[aria-label=Send]'),null);}
  finally {await f.close();}
});

test('leaving Notes preserves unconfirmed drafts for the next mount',async()=>{
  const first=await notesFixture(async()=>({ok:false,error:'offline'}));
  await edit(first.container,'survives navigation');await first.close();
  const reopened=await notesFixture(async()=>({ok:false,error:'offline'}),true);
  try { assert.equal(reopened.container.querySelector('textarea').value,'survives navigation'); }
  finally { await reopened.close(); }
});
