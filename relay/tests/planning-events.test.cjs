/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression test. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function compile(file,dependencies,context={}) {
  const exports={};
  const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(code,{exports,require:id=>dependencies[id],...context});return exports;
}
test('successful Relay task writes notify shared tabs; failed writes do not',async()=>{
  const changes=[];const writes=[];const filters=[];let error=null;
  const window={localStorage:{setItem:(key,value)=>writes.push({key,value})},dispatchEvent:event=>changes.push(event.type)};
  const shared=compile('src/lib/arrow-planning.ts',{}, {window,CustomEvent:class {constructor(type){this.type=type;}}});
  const chain={insert:()=>chain,update:()=>chain,delete:()=>chain,select:()=>chain,eq:(key,value)=>{filters.push([key,value]);return chain;},single:async()=>({data:error?null:{id:'task'},error}),then:resolve=>Promise.resolve({error}).then(resolve)};
  const client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:()=>chain};
  const actions=compile('src/lib/actions/todos.ts',{'@/lib/supabase/client':{createClient:()=>client},'@/lib/arrow-planning':shared,'@/lib/date':compile('src/lib/date.ts',{})});
  for(const action of [()=>actions.createTodo('New task','2026-10-01'),()=>actions.setTodoCompleted('task',true),()=>actions.deleteTodo('task')]){
    const before=changes.length;error=null;assert.equal((await action()).ok,true);assert.equal(changes.length,before+1);
    error={message:'network error'};assert.equal((await action()).ok,false);assert.equal(changes.length,before+1);
  }
  assert.ok(writes.every(entry=>entry.key==='arrow_shared_data_ping_v1'));assert.equal(new Set(writes.map(entry=>entry.value)).size,3);
  assert.ok(filters.some(([key,value])=>key==='user_id'&&value==='owner'));
});

