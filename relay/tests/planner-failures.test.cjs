/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS effect regression tests. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const id='00000000-0000-0000-0000-000000000001';
function fixture(client) {
  const effects=[],states=[];const exports={};
  const hooks={useState:initial=>[initial,value=>states.push(value)],useEffect:fn=>effects.push(fn),useMemo:fn=>fn(),Suspense:()=>null};
  const deps={'react':hooks,'next/navigation':{useSearchParams:()=>({get:()=>id})},'@/lib/supabase/client':{createClient:()=>client},'@/lib/date':{localDateKey:()=> '2026-10-07'}};
  const code=ts.transpileModule(fs.readFileSync('src/app/(app)/planner/view/page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code+'\nexports.testView=PlanView;', {exports,require:name=>name==='react/jsx-runtime'?require(name):deps[name]??new Proxy({},{get:()=>()=>null})});
  exports.testView();const cleanup=effects[0]();
  return {states,cleanup,settle:()=>new Promise(resolve=>setImmediate(resolve))};
}
test('planner authentication rejection ends loading with a recoverable error',async()=>{
  const f=fixture({auth:{getUser:async()=>{throw new Error('offline');}}});await f.settle();assert.equal(f.states[0].routeId,id);assert.match(f.states[0].error,/could not load/);f.cleanup();
});
test('a signed-out planner does not remain in its skeleton',async()=>{
  const f=fixture({auth:{getUser:async()=>({data:{user:null}})}});await f.settle();assert.match(f.states[0].error,/Sign in again/);f.cleanup();
});
test('database failure does not masquerade as a missing plan',async()=>{
  const chain={select:()=>chain,eq:()=>chain,single:async()=>({data:null,error:{message:'offline'}})};
  const f=fixture({auth:{getUser:async()=>({data:{user:{id:'owner'}}})},from:()=>chain});await f.settle();assert.match(f.states[0].error,/could not load/);f.cleanup();
});
test('a cancelled planner load cannot publish its old result',async()=>{
  let release;const pending=new Promise(resolve=>{release=resolve;});
  const f=fixture({auth:{getUser:()=>pending}});f.cleanup();release({data:{user:null}});await f.settle();assert.equal(f.states.length,0);
});
