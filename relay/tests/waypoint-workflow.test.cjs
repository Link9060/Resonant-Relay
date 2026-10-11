/* eslint-disable @typescript-eslint/no-require-imports -- Node React workflow regression tests. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {createRequire}=require('node:module');
const sourceRoot=process.env.ARROW_WAYPOINT_SOURCE;
const dependencies=createRequire(process.env.ARROW_UI_DEPENDENCIES || path.resolve('package.json'));
const React=dependencies('react');
const ts=dependencies('typescript');
const {JSDOM}=dependencies('jsdom');
const enabled=Boolean(sourceRoot);
function localDay(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
async function mount(view='shell',draft=null) {
 const dom=new JSDOM('<div id="root"></div>',{url:'https://example.test/Resonant-Relay/arrow/waypoint/?tab=dump',pretendToBeVisual:true});
 const originals=new Map();for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,location:dom.window.location,localStorage:dom.window.localStorage,HTMLElement:dom.window.HTMLElement,Element:dom.window.Element,IS_REACT_ACT_ENVIRONMENT:true})){originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});}
 const task={id:'task',title:'Fixture task',due_on:localDay(),completed:false,position:0,estimated_minutes:20,scheduled_on:null,scheduled_start:null};
 const history={id:'history',raw_input:'Saved fixture input',summary:'Saved fixture reasoning',intent:'Plan well',next_move:'Do the task',signals:[],route:[],questions:['When are you free?'],source:'ravin',applied:true,created_at:new Date().toISOString()};
 const api={currentPlanningAccount:()=> 'owner',loadSharedPlanningData:async()=>({todos:[task],events:[],items:[],notes:[],captures:[history],warnings:[]}),waypointRowToCapturedItem:item=>item,migrateLegacyWaypointItems:async()=>{},generateAutoPlan:async()=>({blocks:[{task_id:'task',title:task.title,date:localDay(),start:'09:00',end:'09:20',minutes:20}],conflicts:[],unscheduled:[],source:'calendar',can_apply:true}),applyScheduleBlock:async()=>{},setSharedTodoCompleted:async()=>{}};
 if(draft)dom.window.localStorage.setItem('arrow_capture_draft_v2:owner',JSON.stringify({version:2,owner:'owner',savedAt:Date.now(),dump:draft,captures:[],interpretation:null,captureId:null}));
 const modules=new Map();function load(file){if(modules.has(file))return modules.get(file).exports;const compiledModule={exports:{}};modules.set(file,compiledModule);const javascript=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;const requireSource=specifier=>{if(specifier==='@/lib/ravin')return api;if(specifier.startsWith('@/')||specifier.startsWith('.')){const base=specifier.startsWith('@/')?path.join(sourceRoot,'src',specifier.slice(2)):path.resolve(path.dirname(file),specifier);return load(fs.existsSync(base+'.tsx')?base+'.tsx':base+'.ts');}return dependencies(specifier);};new Function('require','module','exports',javascript)(requireSource,compiledModule,compiledModule.exports);return compiledModule.exports;}
 const {createRoot}=dependencies('react-dom/client');const root=createRoot(dom.window.document.getElementById('root'));
 const Component=load(path.join(sourceRoot,'src/components',view==='shell'?'waypoint-shell.tsx':'planning-controls.tsx'))[view==='shell'?'WaypointShell':'PlanningControls'];
 let props=view==='shell'?{}:{tasks:[task],events:[],plans:[],onChanged:async()=>{}};
 await React.act(async()=>{root.render(React.createElement(Component,props));});
 const buttons=()=>Array.from(dom.window.document.querySelectorAll('button'));
 const button=text=>{const found=buttons().find(b=>b.textContent.trim()===text);assert.ok(found,`Button missing: ${text}`);return found;};
 async function click(text){await React.act(async()=>{button(text).click();});}
 async function input(label,value){const control=Array.from(dom.window.document.querySelectorAll('input,select,textarea')).find(e=>e.getAttribute('aria-label')===label || e.closest('label')?.textContent.startsWith(label));assert.ok(control,`Input missing: ${label}`);await React.act(async()=>{const proto=control.tagName==='TEXTAREA'?dom.window.HTMLTextAreaElement.prototype:control.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:dom.window.HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(control,value);control.dispatchEvent(new dom.window.Event(control.tagName==='SELECT'?'change':'input',{bubbles:true}));});return control;}
 return {dom,api,button,click,input,task,async rerender(next){props={...props,...next};await React.act(async()=>root.render(React.createElement(Component,props)));},async close(){await React.act(async()=>root.unmount());dom.window.close();for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}};
}
test('draft restores, tab URLs follow navigation, and history cannot reapply saved work',{skip:!enabled},async()=>{
 const f=await mount('shell','Unfinished fixture Capture');try{
 assert.equal(f.dom.window.document.querySelector('textarea').value,'Unfinished fixture Capture');
 await f.click('Review');assert.equal(new URL(f.dom.window.location.href).searchParams.get('tab'),'review');await f.click('Open reasoning');
 assert.match(f.dom.window.document.body.textContent,/Saved fixture reasoning/);assert.equal(f.dom.window.document.querySelector('textarea').readOnly,true);assert.equal(f.button('Find my direction').disabled,true);assert.equal(f.dom.window.document.body.textContent.includes('Apply selected'),false);
 await f.click('Return to unfinished Capture');assert.equal(f.dom.window.document.querySelector('textarea').value,'Unfinished fixture Capture');
 }finally{await f.close();}
});
test('schedule approval disables after data changes and requires a new preview',{skip:!enabled},async()=>{
 const f=await mount('controls');try{
 await f.click('Plan your week');await f.click('Preview schedule');assert.equal(f.button('Apply 1 selected blocks').disabled,false);
 await f.rerender({tasks:[{...f.task,title:'Changed fixture task'}]});assert.equal(f.button('Apply 1 selected blocks').disabled,true);assert.match(f.dom.window.document.body.textContent,/Preview again before applying/);
 await f.click('Preview schedule');assert.equal(f.button('Apply 1 selected blocks').disabled,false);
 }finally{await f.close();}
});
test('cancel editing resets the next entry rather than inheriting a plan date/type',{skip:!enabled},async()=>{
 const f=await mount('controls');try{
 await f.rerender({plans:[{id:'waypoint:plan',title:'Undated fixture plan',type:'project',date:null,duration_minutes:120}]});await f.click('Add or edit');
 const edit=Array.from(f.dom.window.document.querySelectorAll('button')).find(b=>b.textContent.includes('Undated fixture plan'));await React.act(async()=>edit.click());await f.click('Cancel edit');
 assert.equal(f.dom.window.document.querySelector('select').value,'task');assert.equal(f.dom.window.document.querySelector('input[type="date"]').value,localDay());assert.equal(f.dom.window.document.querySelector('input[type="number"]').value,'30');
 }finally{await f.close();}
});
