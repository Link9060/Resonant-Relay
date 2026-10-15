/* eslint-disable @typescript-eslint/no-require-imports -- Component regression tests. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<html><body></body></html>',{url:'https://enterarrow.com/relay/'});
global.window=dom.window;global.document=dom.window.document;global.HTMLElement=dom.window.HTMLElement;global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react');const {createRoot}=require('react-dom/client');const output={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/dashboard/ravin-dashboard-widget.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:output,window,URLSearchParams,require:id=>id==='@/lib/config'?{IS_BETA:false}:id==='lucide-react'?{ArrowUpRight:()=>null}:require(id)});
const props=el=>el[Object.keys(el).find(key=>key.startsWith('__reactProps$'))];
test('RAVIN routes preserve multiline and special characters on public and beta',()=>{
 const prompt='First & second?\n# third + ✓';
 for(const beta of [false,true]){const url=new URL(output.ravinDashboardUrl(` ${prompt} `,beta),'https://enterarrow.com');assert.equal(url.pathname,beta?'/Resonant-Relay/arrow/ravin/':'/ravin/');assert.equal(url.searchParams.get('prompt'),prompt);assert.equal(url.searchParams.get('surface'),'relay');}
});
test('widget stages prompts, prevents empty sends, and opens the RAVIN module',async()=>{
 const container=document.createElement('div');document.body.append(container);const root=createRoot(container);const calls=[];window.ArrowOS={navigate:(...args)=>calls.push(args)};
 try {
  await React.act(async()=>root.render(React.createElement(output.RavinDashboardWidget)));
  assert.equal(container.querySelector('button[type=submit]').disabled,true);
  await React.act(async()=>props(container.querySelector('textarea')).onChange({target:{value:'   '}}));
  await React.act(async()=>props(container.querySelector('form')).onSubmit({preventDefault(){}}));assert.equal(calls.length,0);
  const starter=[...container.querySelectorAll('button')].find(b=>b.textContent==='Brain dump');await React.act(async()=>starter.click());
  assert.match(container.querySelector('textarea').value,/review the plan before making changes/);assert.equal(calls.length,0);
  await React.act(async()=>props(container.querySelector('form')).onSubmit({preventDefault(){}}));assert.equal(calls[0][1],'ravin');assert.match(new URL(calls[0][0],'https://enterarrow.com').searchParams.get('prompt'),/brain dump/);
  window.ArrowOS.navigate=()=>{throw new Error('blocked');};await React.act(async()=>props(container.querySelector('form')).onSubmit({preventDefault(){}}));assert.ok(container.querySelector('[role=alert]'));assert.ok(container.querySelector('textarea').value);
  await React.act(async()=>root.render(React.createElement(output.RavinDashboardWidget,{compact:true,micro:true})));assert.equal(container.querySelector('textarea').rows,1);assert.equal(container.querySelector('[aria-label="RAVIN starting points"]'),null);
 } finally {await React.act(async()=>root.unmount());container.remove();}
});
