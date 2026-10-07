/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression tests. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function compile(file,dependencies={},context={}) {
  const exports={};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,require:id=>dependencies[id],URL,URLSearchParams,process:{env:{NEXT_PUBLIC_RELAY_DEPLOY_TARGET:'github-pages'}},...context});
  return exports;
}
test('notification detail links retain the actual chat ID and extra parameters',()=>{
  const {normalizeAppLink,appPageUrl}=compile('src/lib/config.ts');
  assert.equal(appPageUrl(normalizeAppLink('/Resonant-Relay/chats/view/?id=chat-id')),'/Resonant-Relay/chats/view/?id=chat-id');
  assert.equal(normalizeAppLink('/chats/chat-id?from=notification#reply'),'/chats/view/?id=chat-id&from=notification#reply');
  assert.equal(normalizeAppLink('/planner/plan-id?tab=responses'),'/planner/view/?id=plan-id&tab=responses');
  assert.equal(normalizeAppLink('/chats/%ZZ'),'/');
});
test('calendar validation rejects rolled-over days and accepts leap days',()=>{
  const {isValidDateKey}=compile('src/lib/date.ts');
  for(const date of ['2026-02-31','2026-02-29','2026-13-01','2026-00-00','2026-1-01']) assert.equal(isValidDateKey(date),false,date);
  for(const date of ['2028-02-29','2026-10-07']) assert.equal(isValidDateKey(date),true,date);
});
test('task mutations return a recoverable result when authentication throws',async()=>{
  const actions=compile('src/lib/actions/todos.ts',{'@/lib/date':compile('src/lib/date.ts'),'@/lib/supabase/client':{createClient:()=>({auth:{getUser:async()=>{throw new Error('offline');}}})},'@/lib/arrow-planning':{broadcastArrowPlanningChange:()=>assert.fail('failed write broadcast')}});
  for(const action of [()=>actions.createTodo('Task','2026-10-07'),()=>actions.setTodoCompleted('id',true),()=>actions.deleteTodo('id')]) assert.equal((await action()).ok,false);
});
test('notification writes expose database failure and bulk reads stop at their cutoff',async()=>{
  const filters=[];let error={message:'offline'};
  const chain={update:()=>chain,eq:(...args)=>{filters.push(args);return chain;},is:()=>chain,lte:(...args)=>{filters.push(args);return chain;},then:resolve=>Promise.resolve({error}).then(resolve)};
  const actions=compile('src/lib/actions/notifications.ts',{'@/lib/supabase/client':{createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:()=>chain})}});
  assert.equal((await actions.markNotificationRead('id')).ok,false);
  error=null; assert.equal((await actions.markAllNotificationsRead('2026-10-07T12:00:00.000Z')).ok,true);
  assert.ok(filters.some(([key,value])=>key==='created_at'&&value==='2026-10-07T12:00:00.000Z'));
});
function edgeHelpers() {
  const source=fs.readFileSync('supabase/functions/account-center/index.ts','utf8');
  const functions=source.slice(source.indexOf('function attachmentPaths'));
  const context={};vm.createContext(context);
  vm.runInContext(ts.transpileModule(functions,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
  return context;
}
test('privileged attachment deletion cannot target another sender or conversation',()=>{
  const {attachmentPaths}=edgeHelpers();
  const values=['c/u/file','c/other/file','other/u/file','c/u/../other/file','c/u/./file'];
  assert.equal(JSON.stringify(attachmentPaths(values.map(path=>({path})),'c','u')),JSON.stringify(['c/u/file']));
});
test('account exports read all pages and discard partial exports on later failure',async()=>{
  const {awaitAllRows}=edgeHelpers();
  const rows=Array.from({length:1201},(_,id)=>({id}));let count=0;
  const query=()=>({range:async(start,end)=>{count++;return {data:rows.slice(start,end+1),error:null};}});
  const result=await awaitAllRows(query);assert.equal(result.data.length,1201);assert.equal(count,3);
  const failed=await awaitAllRows(()=>({range:async(start,end)=>start?{data:null,error:{message:'offline'}}:{data:rows.slice(start,end+1),error:null}}));
  assert.equal(failed.data,null);assert.ok(failed.error);
});
