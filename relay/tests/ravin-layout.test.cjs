/* eslint-disable @typescript-eslint/no-require-imports -- Node DOM regressions. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const sourceRoot=process.env.ARROW_RAVIN_SOURCE;
const flush=()=>new Promise(resolve=>setTimeout(resolve,40));
test('real stylesheet cascade keeps message bodies and actions out of the label track',{skip:!sourceRoot},()=>{
 const publicRoot=path.join(sourceRoot,'ravin/public');const html=fs.readFileSync(path.join(publicRoot,'index.html'),'utf8');
 const styles=[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map(match=>match[1].split('?')[0]).filter(file=>!file.startsWith('/')&&!file.startsWith('http'));
 const dom=new JSDOM('<html data-arrow-ravin="true"><head></head><body></body></html>');
 try {
  for(const file of styles){const style=dom.window.document.createElement('style');style.textContent=fs.readFileSync(path.join(publicRoot,file),'utf8');dom.window.document.head.appendChild(style);}
  for(const role of ['user','assistant']){
   const article=dom.window.document.createElement('article');article.className='ravin-message '+role;article.innerHTML='<div class="ravin-message-role">Label</div><div class="ravin-message-body">A real sentence that should use the wide content column.</div><div class="ravin-message-actions">Copy</div>';dom.window.document.body.appendChild(article);
   const computed=dom.window.getComputedStyle(article);assert.equal(computed.display,'grid');assert.match(computed.gridTemplateColumns,role==='user'?/^minmax\(0,\s*1fr\) 64px$/ : /^64px minmax\(0,\s*1fr\)$/);
   assert.equal(computed.gridTemplateAreas,role==='user'?'"body role" "actions ."':'"role body" ". actions"');
   assert.equal(dom.window.getComputedStyle(article.querySelector('.ravin-message-body')).gridArea,'body');assert.equal(dom.window.getComputedStyle(article.querySelector('.ravin-message-actions')).gridArea,'actions');
  }
 }finally{dom.window.close();}
});
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
 w.ArrowOS={closedOverlays:0,closeOverlays(){this.closedOverlays++;},closePanel(){}};
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
 const anchor=f.d.getElementById('settingsBtn');anchor.click();await flush();let pop=f.d.querySelector('.ravin-popover');assert.ok(f.w.ArrowOS.closedOverlays>0);assert.equal(pop.getAttribute('role'),'dialog');assert.ok(pop.querySelector('[data-ravin-appearance]'));assert.match(pop.style.getPropertyValue('--ravin-popover-top'),/px$/);
 pop.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(f.d.querySelector('.ravin-popover'),null);assert.equal(f.d.activeElement,anchor);assert.equal(anchor.getAttribute('aria-expanded'),'false');
 anchor.click();await flush();f.w.dispatchEvent(new f.w.CustomEvent('arrow:panelopen'));assert.equal(f.d.querySelector('.ravin-popover'),null);assert.equal(anchor.getAttribute('aria-expanded'),'false');
 }finally{f.close();}
});
test('closing shared overlays also dismisses a keyboard-pinned launcher',()=>{
 const source=fs.readFileSync('public/arrow-shell.js','utf8');const instance={root:{dataset:{}},pinned:true};const open=[];let panelClosed=false;
 const scope={state:{instances:[instance]},closePanel:()=>{panelClosed=true;},setOpen:(_instance,value)=>open.push(value)};
 vm.runInNewContext(source.slice(source.indexOf('  function closeSharedOverlays('),source.indexOf('  function closeEverythingOnOutsidePointer(')),scope);scope.closeSharedOverlays();
 assert.equal(panelClosed,true);assert.equal(instance.pinned,false);assert.deepEqual(open,[false]);
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
test('RAVIN compact appearance removes the color grid and IME Enter does not submit',{skip:!sourceRoot},async()=>{
 const f=await fixture();try{
  f.d.getElementById('settingsBtn').click();await flush();assert.equal(f.d.querySelector('.ravin-palette-grid'),null);const select=f.d.querySelector('[data-ravin-experience-select]');assert.ok(select);
  let writes=0;const original=f.w.Storage.prototype.setItem;f.w.Storage.prototype.setItem=function(key,value){if(key==='ravin_experience')writes++;return original.call(this,key,value);};
  select.value='still';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));assert.equal(f.w.localStorage.getItem('ravin_experience'),'still');select.value='flow';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));assert.equal(writes,2);
  const input=f.d.getElementById('messageInput');input.value='In-progress composition';let submitted=0;f.d.getElementById('composer').requestSubmit=()=>submitted++;input.dispatchEvent(new f.w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));assert.equal(submitted,0);
 }finally{f.close();}
});
test('RAVIN drawers consume Escape before navigation and leave unrelated Escape untouched',{skip:!sourceRoot},()=>{
 for(const file of ['ravin-v02.js','ravin-files-ui.js']){
  const source=fs.readFileSync(path.join(sourceRoot,'ravin/public',file),'utf8');const start=source.lastIndexOf('    '+(file==='ravin-v02.js'?'addEventListener':'document.addEventListener')+'("keydown"');const end=source.indexOf('\n    });',start)+8;let handler;let open=true;let closed=0;
  const scope={document:{querySelector:()=>open,addEventListener:(_type,callback)=>{handler=callback;}},addEventListener:(_type,callback)=>{handler=callback;},closeDrawer:()=>closed++};vm.runInNewContext(source.slice(start,end),scope);
  let prevented=false,stopped=false;handler({key:'Escape',preventDefault:()=>{prevented=true;},stopImmediatePropagation:()=>{stopped=true;}});assert.equal(closed,1);assert.equal(prevented,true);assert.equal(stopped,true);open=false;handler({key:'Escape',preventDefault(){assert.fail('No drawer was open');},stopImmediatePropagation(){assert.fail('No drawer was open');}});assert.equal(closed,1);
 }
});
