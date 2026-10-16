/* eslint-disable @typescript-eslint/no-require-imports -- Browser notification regression fixture. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('public/arrow-shell.js','utf8');
const pause=()=>new Promise(resolve=>setTimeout(resolve,35));
async function fixture(path='/orbit/',module='orbit') {
 const dom=new JSDOM(`<div data-arrow-os-shell data-module="${module}"></div>`,{url:'https://enterarrow.com'+path,pretendToBeVisual:true,runScripts:'outside-only'});const w=dom.window;let rows=[];const intervals=[];
 w.localStorage.setItem('sb-cnorozrjugxpanpfmssa-auth-token',JSON.stringify({access_token:'test',user:{id:'owner'},expires_at:9999999999}));
 w.matchMedia=()=>({matches:true,addEventListener(){}});w.setInterval=(fn,ms)=>{intervals.push([fn,ms]);return intervals.length;};
 w.fetch=async url=>({ok:true,status:200,text:async()=>JSON.stringify(String(url).includes('/notifications?')?rows:'user')});
 w.requestAnimationFrame=()=>0;w.cancelAnimationFrame=()=>{};w.eval(source);w.ArrowOS.mountAll();await pause();
 return {w,dom,rows:value=>{rows=value;},tick:async()=>{intervals.find(x=>x[1]===10000)[0]();await pause();},close:async()=>{await new Promise(resolve=>setTimeout(resolve,100));dom.window.close();}};
}
const row=(id='one')=>({id,title:'RAVIN finished thinking',body:'Your response is ready.',link:'/ravin/?conversation_id=11111111-1111-4111-8111-111111111111',created_at:new Date().toISOString(),read_at:null});
test('a RAVIN completion appears in Orbit, deduplicates, and clears after account signout',async()=>{
 const f=await fixture();try{f.rows([row()]);await f.tick();assert.equal(f.w.document.querySelectorAll('.arrow-os-notification-toast').length,1);assert.match(f.w.document.querySelector('.arrow-os-notification-button').textContent,/1/);
 const toast=f.w.document.querySelector('.arrow-os-notification-toast');toast.querySelector('[aria-label="Dismiss notification"]').click();await f.tick();assert.equal(f.w.document.querySelector('.arrow-os-notification-toast'),null);
 f.w.ArrowOS.openPanel('notifications','orbit');assert.match(f.w.document.querySelector('.arrow-os-inbox-row').textContent,/RAVIN finished/);
 f.w.localStorage.removeItem('sb-cnorozrjugxpanpfmssa-auth-token');f.w.dispatchEvent(new f.w.StorageEvent('storage',{key:'sb-cnorozrjugxpanpfmssa-auth-token'}));await pause();assert.equal(f.w.document.querySelector('.arrow-os-notification-button'),null,'button cleared');assert.equal(f.w.document.querySelector('.arrow-os-inbox-row'),null,'inbox cleared');
 }finally{await f.close();}
});
test('Relay keeps its existing bell and notification content is rendered as text',async()=>{
 const f=await fixture('/relay/','relay');try{f.rows([{...row(),title:'<img src=x onerror=alert(1)>'}]);await f.tick();assert.equal(f.w.document.querySelector('.arrow-os-notification-button'),null);assert.equal(f.w.document.querySelector('.arrow-os-notification-toast img'),null);assert.match(f.w.document.querySelector('.arrow-os-notification-toast').textContent,/<img/);}finally{await f.close();}
});
test('the current focused RAVIN conversation does not display a redundant site toast',async()=>{
 const f=await fixture('/ravin/?conversation_id=11111111-1111-4111-8111-111111111111','ravin');try{f.w.document.hasFocus=()=>true;f.rows([row()]);await f.tick();assert.equal(f.w.document.querySelector('.arrow-os-notification-toast'),null);}finally{await f.close();}
});
test('Relay notification links target the matching public or beta center',()=>{
 for(const beta of [false,true]){const output={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/config.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:output,URL,process:{env:{NEXT_PUBLIC_RELAY_DEPLOY_TARGET:beta?'github-pages':'arrow'}}});const url=new URL(output.notificationPageUrl('/ravin/?conversation_id=one'));assert.equal(url.pathname,beta?'/Resonant-Relay/arrow/ravin/':'/ravin/');assert.equal(url.searchParams.get('conversation_id'),'one');}
});
