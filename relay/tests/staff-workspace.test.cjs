/* eslint-disable @typescript-eslint/no-require-imports -- DOM staff workspace regression fixtures. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {JSDOM}=require('jsdom');
const source=fs.readFileSync('public/arrow-shell.js','utf8');const flush=()=>new Promise(resolve=>setTimeout(resolve,15));
function fixture(role,requested=''){
 const dom=new JSDOM('<main data-arrow-staff-workspace><section id="body"></section></main>',{url:'https://example.test/arrow/orbit/staff/'+requested});const state={activePanel:'moderation',panelBody:dom.window.document.getElementById('body')};const calls=[];
 const rows=[{request_id:'one',id:'one',subject:'Need help',status:'new',role:'user'},{request_id:'two',id:'two',subject:'Resolved issue',status:'resolved',role:'user'}];
 const scope={state,document:dom.window.document,location:dom.window.location,history:dom.window.history,URL,URLSearchParams,staffRole:async()=>role,rpc:async(name,body)=>{calls.push({name,body});return name==='owner_dashboard_stats'?{accounts:{total:2}}:name==='owner_storage_overview'?{file_bytes:200}:rows;},arrowData:async()=>rows,escapeHtml:value=>String(value),panelEmpty:value=>value,sharedDataError:error=>error.message,confirm:()=>false,prompt:()=>null};
 vm.runInNewContext(source.slice(source.indexOf('  function renderOwnerOverview('),source.indexOf('  let calendarLoad =')),scope);
 return {dom,state,scope,calls};
}
test('moderators see only operations and cannot select owner queues through the URL',async()=>{
 const f=fixture('moderator','?queue=users');try{await f.scope.renderModeration();assert.deepEqual([...f.state.panelBody.querySelectorAll('[data-queue]')].map(b=>b.dataset.queue),['requests','email','reports']);assert.equal(f.calls[0].name,'staff_list_requests');assert.equal(f.state.panelBody.querySelector('#arrow-staff-section-title').textContent,'Support requests');}finally{f.dom.window.close();}
});
test('owner workspace groups sections, defaults to overview and filters queues on the current page',async()=>{
 const f=fixture('owner');try{await f.scope.renderModeration();assert.equal(f.state.panelBody.querySelectorAll('[data-queue]').length,7);assert.equal(f.state.panelBody.querySelector('#arrow-staff-section-title').textContent,'Overview');assert.match(f.state.panelBody.textContent,/Storage/);
 f.state.panelBody.querySelector('[data-queue="requests"]').click();await flush();const status=f.state.panelBody.querySelector('#arrow-staff-status');status.value='resolved';status.dispatchEvent(new f.dom.window.Event('change'));assert.match(f.state.panelBody.querySelector('#arrow-staff-result-count').textContent,/1 of 2/);assert.equal(f.state.panelBody.querySelector('#arrow-staff-queue').textContent.includes('Need help'),false);
 f.state.panelBody.querySelector('[data-queue="users"]').click();await flush();assert.equal(f.state.panelBody.querySelectorAll('.arrow-staff-account-tools').length,2);assert.equal(f.state.panelBody.querySelector('.arrow-staff-account-tools').open,false);assert.equal(new URL(f.dom.window.location.href).searchParams.get('queue'),'users');
 }finally{f.dom.window.close();}
});
test('a slow queue cannot overwrite the section selected afterward',async()=>{
 const f=fixture('moderator');let resolve;f.scope.rpc=name=>name==='staff_list_requests'?new Promise(done=>{resolve=done;}):Promise.resolve([{subject:'Current report',status:'submitted'}]);try{
 const initial=f.scope.renderModeration();await flush();f.state.panelBody.querySelector('[data-queue="reports"]').click();await flush();resolve([{subject:'Stale request',status:'new'}]);await initial;assert.match(f.state.panelBody.querySelector('#arrow-staff-queue').textContent,/Current report/);assert.equal(f.state.panelBody.querySelector('#arrow-staff-queue').textContent.includes('Stale request'),false);
 }finally{f.dom.window.close();}
});
test('ordinary users get no staff records or action controls',async()=>{
 const f=fixture('user');try{await f.scope.renderModeration();assert.equal(f.calls.length,0);assert.equal(f.state.panelBody.querySelector('[data-queue]'),null);assert.match(f.state.panelBody.textContent,/Staff access is required/);}finally{f.dom.window.close();}
});
test('staff launch navigates to a dedicated Orbit route instead of opening a popup',()=>{
 const links=[];const scope={PANEL_LABELS:{moderation:'Staff'},document:{querySelector:()=>null},location:{assign:url=>links.push(url)},resolveHref:href=>'/Resonant-Relay/arrow'+href};vm.runInNewContext(source.slice(source.indexOf('  function openPanel('),source.indexOf('  function closePanel(')),scope);scope.openPanel('moderation','orbit');assert.deepEqual(links,['/Resonant-Relay/arrow/orbit/staff/']);
});
