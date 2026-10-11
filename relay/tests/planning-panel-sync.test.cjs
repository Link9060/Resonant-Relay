/* eslint-disable @typescript-eslint/no-require-imports -- Node CommonJS regression test. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {JSDOM}=require('jsdom');
test('shared panel refreshes on same-tab changes and reconnect without discarding draft input',async()=>{
 const dom=new JSDOM('<div id="panel"><textarea></textarea></div>',{pretendToBeVisual:true});const {window}=dom;const state={activePanel:'notes',panelBody:window.document.getElementById('panel')};let renders=0;
 const source=fs.readFileSync('public/arrow-shell.js','utf8');const start=source.indexOf('  let planningPanelRefresh;');const end=source.indexOf('  let shellAccountId=',start);
 vm.runInNewContext(source.slice(start,end),{window,document:window.document,state,calendarLoad:null,setTimeout,clearTimeout,setInterval(){},renderPanel(){renders++;}});
 state.panelBody.querySelector('textarea').value='Unsaved note';window.dispatchEvent(new window.CustomEvent('arrow:planning-changed'));await new Promise(r=>setTimeout(r,230));assert.equal(renders,0);assert.equal(state.panelBody.querySelector('textarea').value,'Unsaved note');
 state.panelBody.querySelector('textarea').value='';window.dispatchEvent(new window.CustomEvent('arrow:planning-changed'));await new Promise(r=>setTimeout(r,230));assert.equal(renders,1);
 window.dispatchEvent(new window.Event('online'));await new Promise(r=>setTimeout(r,230));assert.equal(renders,2);dom.window.close();
});
