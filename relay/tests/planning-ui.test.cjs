/* eslint-disable @typescript-eslint/no-require-imports -- Node DOM regression tests. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {JSDOM}=require('jsdom');
const source=fs.readFileSync('public/arrow-shell.js','utf8');
const flush=()=>new Promise(resolve=>setTimeout(resolve,15));
function fixture(panel) {
 const dom=new JSDOM('<section id="panel"></section>');const state={activePanel:panel,renderVersion:0,panelBody:dom.window.document.getElementById('panel')};
 const scope={state,document:dom.window.document,ownerNote:()=>'',icon:()=>'',escapeHtml:value=>String(value),escapeAttr:value=>String(value),panelEmpty:value=>value,currentArrowUserId:()=> 'owner',localDateInputValue:()=> '2026-10-12',sharedDataError:e=>e.message,confirm:()=>false,formatEventDate:(date,time)=>date+' '+time,resolveHref:()=>'/relay/',savePanelAction:async(_control,action)=>{await action();return true;}};
 return {dom,state,scope};
}
test('shared tasks defaults to open work and paginates completed work newest first',async()=>{
 const f=fixture('tasks'),queries=[];
 f.scope.arrowData=async path=>{queries.push(path);const url=new URL(path,'https://example.test');if(url.searchParams.get('completed')==='eq.false')return [];const offset=Number(url.searchParams.get('offset'));return Array.from({length:85},(_,i)=>({id:'done-'+i,title:'Recent completed '+i,due_on:'2026-10-12',completed:true})).slice(offset,offset+81);};
 vm.runInNewContext(source.slice(source.indexOf('  let taskListView ='),source.indexOf('  async function renderCalendar()')),f.scope);
 await f.scope.renderTasks();assert.match(queries[0],/completed=eq.false/);assert.match(f.state.panelBody.textContent,/No open tasks/);
 f.state.panelBody.querySelector('[data-task-view="completed"]').click();await flush();assert.match(queries[1],/created_at.desc,id.asc/);assert.match(f.state.panelBody.textContent,/Recent completed 0/);
 f.state.panelBody.querySelector('[data-task-page="next"]').click();await flush();assert.match(queries[2],/offset=80/);assert.match(f.state.panelBody.textContent,/Recent completed 84/);assert.equal(f.state.panelBody.querySelector('[data-task-page="next"]').disabled,true);f.dom.window.close();
});
test('shared calendar shows durations and refuses a timed save without a valid end',async()=>{
 const f=fixture('calendar'),writes=[];
 f.scope.loadCalendarSources=async()=>({events:[{id:'event',title:'Shift',event_date:'2026-10-12',start_time:'09:00',end_time:'11:00',is_all_day:false}],warnings:[]});
 f.scope.arrowData=async(path,options)=>{writes.push({path,body:options.body});return [];};
 vm.runInNewContext(source.slice(source.indexOf('  async function renderCalendar()'),source.indexOf('  function renderLinks()')),f.scope);await f.scope.renderCalendar();assert.match(f.state.panelBody.textContent,/09:00–11:00/);
 const form=f.state.panelBody.querySelector('form'),title=form.querySelector('input[type="text"]'),times=form.querySelectorAll('input[type="time"]');title.value='Test';times[0].value='09:00';times[0].dispatchEvent(new f.dom.window.Event('change'));
 assert.equal(times[1].required,true);form.dispatchEvent(new f.dom.window.Event('submit',{cancelable:true}));await flush();assert.equal(writes.length,0);
 times[1].value='09:30';times[1].dispatchEvent(new f.dom.window.Event('input'));form.dispatchEvent(new f.dom.window.Event('submit',{cancelable:true}));await flush();assert.equal(writes[0].body.end_time,'09:30');f.dom.window.close();
});
