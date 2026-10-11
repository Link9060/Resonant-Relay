/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression tests. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function compile(file,env={}) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,process:{env},require:()=>({}),AbortSignal});
  return exports;
}
function client(pages,details={},failure=null) {
  const calls=[];
  return {calls,from(table){
    const call={table,filters:[]};calls.push(call);
    const chain={};
    for(const method of ['select','eq','gte','or','order','limit','in','abortSignal'])chain[method]=(...args)=>{call.filters.push([method,...args]);return chain;};
    chain.then=resolve=>Promise.resolve({data:table==='messages'?pages.shift():details[table]??[],error:table===failure?{message:'offline'}:null}).then(resolve);
    return chain;
  }};
}
test('reconnect recovers bursts, edits and deletions and retains user hidden/pin preferences',async()=>{
  const {recoverChat}=compile('src/lib/chat-recovery.ts');
  const rows=Array.from({length:201},(_,i)=>({id:String(i).padStart(4,'0'),created_at:'2026-10-11T12:00:00Z',body:i===0?'edited while disconnected':'missed'}));
  const db=client([rows.slice(0,200),rows.slice(200)],{hidden_messages:[{message_id:'0001'}],message_reactions:[{message_id:'0000',emoji:'👍'}],message_pins:[{message_id:'0000'}]});
  const recovered=await recoverChat(db,'conversation','owner',rows[0]);
  assert.equal(recovered.messages.length,200);
  assert.equal(recovered.messages[0].body,'edited while disconnected');
  assert.equal(recovered.messages.at(-1).id,'0200');
  assert.ok(!recovered.messages.some(row=>row.id==='deleted-before-reconnect'||row.id==='0001'));
  assert.equal(recovered.reactions[0].emoji,'👍');assert.equal(recovered.pins[0],'0000');
  const messageCalls=db.calls.filter(call=>call.table==='messages');
  assert.ok(messageCalls[1].filters.some(([method,value])=>method==='or'&&value.includes('id.gt.0199')));
  assert.ok(messageCalls.every(call=>call.filters.some(([method,key,value])=>method==='eq'&&key==='conversation_id'&&value==='conversation')));
  assert.ok(db.calls.filter(call=>['hidden_messages','message_pins'].includes(call.table)).every(call=>call.filters.some(([method,key,value])=>method==='eq'&&key==='user_id'&&value==='owner')));
});
test('failed hidden-message lookup never publishes a potentially visible snapshot',async()=>{
  const {recoverChat}=compile('src/lib/chat-recovery.ts');
  await assert.rejects(recoverChat(client([[{id:'a',created_at:'now'}]],{},'hidden_messages'),'c','u',null));
});
test('an initially empty chat fetches new messages in chronological order',async()=>{
  const {recoverChat}=compile('src/lib/chat-recovery.ts');
  const result=await recoverChat(client([[{id:'b'},{id:'a'}]]),'c','u',null);
  assert.equal(result.messages.map(row=>row.id).join(','),'a,b');
});
test('default login destination matches the deployment and leaves public Relay behavior intact',()=>{
  const config=env=>compile('src/lib/config.ts',env).defaultSignedInUrl();
  assert.equal(config({NEXT_PUBLIC_RELAY_DEPLOY_TARGET:'github-pages'}),'/Resonant-Relay/arrow/orbit/');
  assert.equal(config({NEXT_PUBLIC_RELAY_DEPLOY_TARGET:'arrow'}),'/orbit/');
  assert.equal(config({}),'/');
  assert.equal(config({NEXT_PUBLIC_RELAY_CHANNEL:'beta'}),'/space/');
});
