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

test('record review stays collapsed and preserves the selected record action payload',async()=>{
 const f=fixture('moderator');try{await f.scope.renderModeration();const card=f.state.panelBody.querySelector('.arrow-staff-review');assert.equal(card.open,false);assert.equal(f.calls.length,1);card.open=true;const note=card.querySelector('textarea');note.value='Reviewed with care';const select=card.querySelector('select');select.value='reviewing';card.querySelector('button').click();await flush();const save=f.calls.find(call=>call.name==='staff_update_request_status');assert.deepEqual(JSON.parse(JSON.stringify(save.body)),{p_request_id:'one',p_status:'reviewing',p_note:'Reviewed with care'});assert.equal(f.state.panelBody.querySelector('#arrow-staff-queue').getAttribute('aria-busy'),'false');}finally{f.dom.window.close();}
});
test('sorting and filter reset work on the loaded page without additional requests',async()=>{
 const f=fixture('moderator');f.scope.rpc=async()=>[{request_id:'old',subject:'Old urgent',status:'new',created_at:'2025-01-01'},{request_id:'recent',subject:'Recent resolved',status:'resolved',created_at:'2026-01-01'},{request_id:'current',subject:'Current urgent',status:'new',created_at:'2026-02-01'}];try{await f.scope.renderModeration();const titles=()=>[...f.state.panelBody.querySelectorAll('.arrow-staff-record-heading strong')].map(el=>el.textContent);assert.deepEqual(titles(),['Current urgent','Old urgent','Recent resolved']);const sort=f.state.panelBody.querySelector('#arrow-staff-sort');sort.value='oldest';sort.dispatchEvent(new f.dom.window.Event('change'));assert.deepEqual(titles(),['Old urgent','Recent resolved','Current urgent']);const search=f.state.panelBody.querySelector('#arrow-staff-search');search.value='No matches';search.dispatchEvent(new f.dom.window.Event('input'));assert.match(f.state.panelBody.querySelector('#arrow-staff-queue').textContent,/No matching records/);const clear=f.state.panelBody.querySelector('#arrow-staff-clear');assert.equal(clear.hidden,false);clear.click();assert.equal(search.value,'');assert.equal(clear.hidden,true);assert.equal(titles().length,3);assert.equal(f.dom.window.document.activeElement,search);}finally{f.dom.window.close();}
});
test('administrators get their own workspace without owner account actions',async()=>{
 const f=fixture('admin','?queue=users');try{await f.scope.renderModeration();assert.match(f.state.panelBody.querySelector('.arrow-staff-identity').textContent,/Administrator/);assert.equal(f.state.panelBody.querySelectorAll('[data-queue]').length,4);assert.equal(f.state.panelBody.querySelector('.arrow-staff-account-tools'),null);assert.equal(f.state.panelBody.querySelector('[data-queue="audit"]'),null);}finally{f.dom.window.close();}
});
test('failed loads leave controls usable and Refresh retries the current section',async()=>{
 const f=fixture('moderator');let failures=1;f.scope.rpc=async()=>{if(failures-->0)throw new Error('Connection interrupted');return [{subject:'Recovered record',status:'new'}];};try{await f.scope.renderModeration();const host=f.state.panelBody.querySelector('#arrow-staff-queue');assert.equal(host.getAttribute('aria-busy'),'false');assert.match(host.textContent,/Connection interrupted/);assert.equal(f.state.panelBody.querySelector('#arrow-staff-updated').textContent,'');const refresh=f.state.panelBody.querySelector('#arrow-staff-refresh');assert.equal(refresh.disabled,false);refresh.click();await flush();assert.match(host.textContent,/Recovered record/);assert.match(f.state.panelBody.querySelector('#arrow-staff-updated').textContent,/Updated/);}finally{f.dom.window.close();}
});
