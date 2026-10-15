/* eslint-disable @typescript-eslint/no-require-imports -- Channel navigation regression fixture. */
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('public/arrow-shell.js','utf8');
test('public offers beta access and beta returns to public without rewriting destinations or transferring tokens',async()=>{
 for(const [url,target] of [['https://enterarrow.com/orbit/','https://link9060.github.io/Resonant-Relay/beta-access/'],['https://link9060.github.io/Resonant-Relay/arrow/orbit/','https://enterarrow.com/']]){
  const dom=new JSDOM('<div data-arrow-os-shell data-module="orbit"></div>',{url,pretendToBeVisual:true,runScripts:'outside-only'});const w=dom.window;
  try{w.matchMedia=()=>({matches:false,addEventListener(){}});w.fetch=async()=>({ok:true,status:200,text:async()=>'"user"'});w.eval(source);await new Promise(resolve=>setTimeout(resolve,40));
   const link=w.document.querySelector('.arrow-os-channel-link');assert.equal(link?.href,target);link.addEventListener('click',event=>event.preventDefault());link.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(link.href,target);assert.equal(new URL(link.href).search,'');assert.equal(new URL(link.href).hash,'');
   w.ArrowOS.openPanel('settings','orbit');const hrefs=[...w.document.querySelectorAll('a[data-arrow-channel]')].map(a=>a.href);assert.ok(hrefs.includes('https://enterarrow.com/'));assert.ok(hrefs.includes('https://link9060.github.io/Resonant-Relay/'));
  }finally{dom.window.close();}
 }
});
