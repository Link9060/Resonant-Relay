/* eslint-disable @typescript-eslint/no-require-imports -- Node DOM regressions. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const sourceRoot=process.env.ARROW_RAVIN_SOURCE;
const flush=()=>new Promise(resolve=>setTimeout(resolve,40));
async function fixture(){
 const dom=new JSDOM('<!doctype html><html data-arrow-ravin="true"><body></body></html>',{url:'https://example.test/arrow/ravin/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 const observers=[];const NativeObserver=w.MutationObserver;
 w.MutationObserver=class extends NativeObserver {constructor(callback){super(callback);observers.push(this);}};
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 w.RAVIN_CONFIG={supabaseUrl:'https://example.test',supabaseAnonKey:'fixture'};
 w.RavinAuth={ensureSession:async()=>true,getAccessToken:()=> 'fixture'};
 w.localStorage.setItem('ravin_access_token','fixture');
 w.localStorage.setItem('ravin_user',JSON.stringify({id:'fixture',email:'fixture@example.test'}));
 w.localStorage.setItem('ravin_token_expires_at',String(Date.now()+3600000));
 w.fetch=async()=>({ok:true,status:200,json:async()=>[],text:async()=> '[]'});
 w.ArrowOS={closePanel(){}};
 w.eval(fs.readFileSync(path.join(sourceRoot,'ravin/public/ravin-shell.js'),'utf8'));
 await flush();
 w.eval(fs.readFileSync(path.join(sourceRoot,'ravin/public/ravin-clean.js'),'utf8'));
 await flush();
 return {dom,w,d:w.document,close(){observers.forEach(observer=>observer.disconnect());dom.window.close();}};
}
test('collapse is a separate keyboard button; search shortcut reveals collapsed history',{skip:!sourceRoot},async()=>{
 const f=await fixture();try{
 const collapse=f.d.getElementById('collapseBtn');assert.equal(collapse.tagName,'BUTTON');assert.equal(collapse.closest('#accountBtn'),null);
 collapse.click();assert.equal(f.d.getElementById('ravinApp').classList.contains('sidebar-collapsed'),true);
 f.w.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'k',ctrlKey:true,cancelable:true}));
 assert.equal(f.d.getElementById('ravinApp').classList.contains('sidebar-collapsed'),false);assert.equal(f.d.activeElement.id,'historySearch');
 }finally{f.close();}
});
test('settings uses a dialog, Escape restores focus, and shared panels close it',{skip:!sourceRoot},async()=>{
 const f=await fixture();try{
 const anchor=f.d.getElementById('settingsBtn');anchor.click();await flush();let pop=f.d.querySelector('.ravin-popover');assert.equal(pop.getAttribute('role'),'dialog');assert.ok(pop.querySelector('[data-ravin-appearance]'));assert.match(pop.style.getPropertyValue('--ravin-popover-top'),/px$/);
 pop.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(f.d.querySelector('.ravin-popover'),null);assert.equal(f.d.activeElement,anchor);assert.equal(anchor.getAttribute('aria-expanded'),'false');
 anchor.click();await flush();f.w.dispatchEvent(new f.w.CustomEvent('arrow:panelopen'));assert.equal(f.d.querySelector('.ravin-popover'),null);assert.equal(anchor.getAttribute('aria-expanded'),'false');
 }finally{f.close();}
});
test('RAVIN appearance positioning honors the smaller keyboard viewport',{skip:!sourceRoot},()=>{
 const source=fs.readFileSync(path.join(sourceRoot,'ravin/public/ravin-shell.js'),'utf8');
 const values={};const pop={isConnected:true,offsetWidth:480,offsetHeight:760,style:{setProperty:(key,value)=>{values[key]=value;}}};
 const viewport={width:390,height:320,offsetTop:100,offsetLeft:0};const scope={window:{visualViewport:viewport},innerWidth:1440,innerHeight:900};
 vm.runInNewContext(source.slice(source.indexOf('  function positionPopover('),source.indexOf('  function buildPopover(')),scope);
 scope.positionPopover(pop,{isConnected:true,getBoundingClientRect:()=>({right:1400,top:500,bottom:540})});
 assert.ok(parseFloat(pop.style.left)>=12);assert.ok(parseFloat(pop.style.left)+366<=390-12);assert.ok(parseFloat(pop.style.top)>=112);assert.ok(parseFloat(pop.style.top)+parseFloat(pop.style.maxHeight)<=408);assert.equal(values['--ravin-popover-top'],pop.style.top);
});
test('opening a shared panel collapses the launcher instead of stacking two menus',()=>{
 const source=fs.readFileSync('public/arrow-shell.js','utf8');const root={dataset:{}};const instance={root,pinned:true};const open=[];const events=[];
 const panel={dataset:{},querySelector:()=>null};
 const scope={PANEL_LABELS:{calendar:'Calendar'},state:{instances:[instance],renderVersion:0,panelTitle:{},panelAnchor:null},window:{dispatchEvent:event=>events.push(event.type)},CustomEvent:class {constructor(type){this.type=type;}},ensurePanel:()=>panel,positionPanel(){},updateHostTheme(){},renderPanel(){},setOpen:(_instance,value)=>open.push(value),updateInstanceState(){},requestAnimationFrame(){},document:{querySelector(){}}};
 vm.runInNewContext(source.slice(source.indexOf('  function openPanel('),source.indexOf('  function closePanel(')),scope);scope.openPanel('calendar','ravin',{});
 assert.deepEqual(open,[false]);assert.equal(instance.pinned,false);assert.equal(root.dataset.pinned,'false');assert.deepEqual(events,['arrow:panelopen']);
});
test('shared panel stays inside the viewport even when launched from the left sidebar',()=>{
 const source=fs.readFileSync('public/arrow-shell.js','utf8');
 for(const viewport of [{width:1440,height:900,offsetLeft:0,offsetTop:0},{width:390,height:320,offsetLeft:0,offsetTop:0},{width:600,height:400,offsetLeft:80,offsetTop:100}]){
  const panel={style:{}};const scope={window:{visualViewport:viewport},innerWidth:1440,innerHeight:900,ensurePanel:()=>panel};
  vm.runInNewContext(source.slice(source.indexOf('  function positionPanel('),source.indexOf('  function openPanel(')),scope);
  scope.positionPanel({getBoundingClientRect:()=>({right:240,bottom:500})});
  const left=parseFloat(panel.style.left),top=parseFloat(panel.style.top),width=parseFloat(panel.style.width),height=parseFloat(panel.style.maxHeight);
  assert.ok(left>=viewport.offsetLeft+12);assert.ok(left+width<=viewport.offsetLeft+viewport.width-12);assert.ok(top>=viewport.offsetTop+12);assert.ok(top+height<=viewport.offsetTop+viewport.height-12);
 }
});
