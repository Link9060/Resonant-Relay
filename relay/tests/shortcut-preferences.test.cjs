/* eslint-disable @typescript-eslint/no-require-imports -- React keyboard regression fixtures. */
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const React=require('react');const ts=require('typescript');const {JSDOM}=require('jsdom');const {createRoot}=require('react-dom/client');
async function fixture(component='StillShortcuts'){
 const dom=new JSDOM('<html data-relay-experience="flow"><body><div id="root"></div><textarea id="typing"></textarea></body></html>',{url:'https://example.test',pretendToBeVisual:true});const w=dom.window;w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 const style=w.document.createElement('style');style.textContent=fs.readFileSync('src/app/global-shortcuts.css','utf8');w.document.head.appendChild(style);
 const originals=new Map();for(const [key,value] of Object.entries({window:w,document:w.document,localStorage:w.localStorage,HTMLElement:w.HTMLElement,Element:w.Element,IS_REACT_ACT_ENVIRONMENT:true})){originals.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});}
 const navigations=[],themes=[],saves=[];w.ArrowOS={applyTheme:(...args)=>themes.push(args),openPanel(){}};
 w.localStorage.setItem('palette','violet');const experience={DEFAULT_EXPERIENCE:'flow',DEFAULT_INTENSITY:55,DEFAULT_LOCK_IN:false,DEFAULT_PALETTE:'monochrome',EXPERIENCE_EVENT:'experience',EXPERIENCE_KEY:'experience',INTENSITY_KEY:'intensity',LOCK_IN_KEY:'lock',PALETTE_KEY:'palette',experiences:[{id:'flow',name:'Flow'},{id:'still',name:'Still'}],normalizeExperience:value=>value||'flow',normalizePalette:value=>value||'monochrome',saveExperience:(...args)=>saves.push(args),saveLockIn(){},resetExperience(){}};
 const config={IS_BETA:true,BASE_PATH:'/Resonant-Relay',appPageUrl:href=>'/Resonant-Relay'+href};
 function load(file){const compiled={exports:{}};const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const resolve=id=>id==='@/lib/config'?config:id==='@/lib/experience-mode'?experience:id==='next/navigation'?{useRouter:()=>({push:href=>navigations.push(href)})}:id==='lucide-react'?{Crosshair:()=>null,RotateCcw:()=>null}:id==='@/components/profile/experience-controls'?load(path.resolve('src/components/profile/experience-controls.tsx')):require(id);
 new Function('require','exports','module',code)(resolve,compiled.exports,compiled);return compiled.exports;}
 const Component=load(path.resolve(component==='StillShortcuts'?'src/components/still-shortcuts.tsx':'src/components/profile/experience-controls.tsx'))[component];const root=createRoot(w.document.getElementById('root'));
 await React.act(async()=>{root.render(React.createElement(Component));await new Promise(resolve=>setTimeout(resolve,40));});
 await React.act(async()=>{await new Promise(resolve=>setTimeout(resolve,40));});
 async function key(value,target=w.document.body,options={}){const event=new w.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true,...options});await React.act(async()=>target.dispatchEvent(event));return event;}
 return {w,dom,navigations,themes,saves,key,async close(){await React.act(async()=>root.unmount());w.close();for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}};
}
test('Relay shortcuts work in Flow, respect typing and composition, and use shared theme',async()=>{
 const f=await fixture();try{await f.key('c');assert.deepEqual(f.navigations,['/chats']);const typing=f.w.document.getElementById('typing');await f.key('n',typing);await f.key('t',f.w.document.body,{isComposing:true});await f.key('p',f.w.document.body,{repeat:true});await f.key('k',f.w.document.body,{altKey:true});assert.equal(f.navigations.length,1);await f.key('d');assert.deepEqual(f.themes,[['dark',true]]);}finally{await f.close();}
});
test('Escape closes shortcut help from a focused button before the ARROW handler',async()=>{
 const f=await fixture();try{await f.key('?');const card=f.w.document.querySelector('[aria-label="Relay keyboard shortcuts"]');assert.ok(card);assert.equal(f.w.getComputedStyle(card).position,'fixed');assert.notEqual(f.w.getComputedStyle(card).display,'none');const trigger=f.w.document.querySelector('.relay-still-help-trigger');trigger.focus();let escaped=0;f.w.addEventListener('keydown',event=>{if(event.key==='Escape')escaped++;});const event=await f.key('Escape',trigger);assert.equal(event.defaultPrevented,true);assert.equal(escaped,0);assert.equal(f.w.document.querySelector('[aria-label="Relay keyboard shortcuts"]'),null);}finally{await f.close();}
});
test('compact Relay preferences removes palette grids and preserves the existing palette on experience change',async()=>{
 const f=await fixture('ExperienceControls');try{assert.equal(f.w.document.querySelector('.relay-accent-option'),null);assert.equal(f.w.document.body.textContent.includes('Color palette'),false);const select=f.w.document.querySelector('select[aria-label="Relay experience"]');assert.ok(select);await React.act(async()=>{select.value='still';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));});assert.deepEqual(f.saves,[['still','violet',55]]);}finally{await f.close();}
});
