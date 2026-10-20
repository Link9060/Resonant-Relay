/* eslint-disable @typescript-eslint/no-require-imports */
const { test }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const React=require('react');
const { renderToStaticMarkup }=require('react-dom/server');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/components/adapt/native-communication.tsx'),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX},fileName:'native-communication.tsx'}).outputText;
const moduleValue={exports:{}};
new Function('require','module','exports',compiled)(require,moduleValue,moduleValue.exports);
const native=moduleValue.exports;
const identities=['core','bloom','haven','atelier','pulse'];
const render=(identity)=>renderToStaticMarkup(React.createElement(native.NativeMessage,{identity,mine:false,className:'original'},
 React.createElement('span',{'data-message':'same'},'Shared message content')));
test('five native message compositions preserve original contents',()=>{
 const html=identities.map(render);
 assert.equal(new Set(html).size,5);
 html.forEach(s=>assert.match(s,/Shared message content/));
 html.forEach(s=>assert.match(s,/data-message="same"/));
 assert.match(html[0],/class="original"/);
 assert.doesNotMatch(html[0],/relay-native-bubble/);
 for(const [i,name] of identities.entries())if(i)assert.match(html[i],new RegExp('relay-native-bubble '+name));
});
test('native composer structures are different while preserving children',()=>{
 const html=identities.map(identity=>renderToStaticMarkup(React.createElement(native.NativeComposer,{identity},
  React.createElement('input',{placeholder:'Same composer',readOnly:true}))));
 assert.equal(new Set(html).size,5);
 html.forEach(s=>assert.match(s,/Same composer/));
 assert.doesNotMatch(html[0],/relay-native-composer/);
 assert.match(html[1],/A little note to send/);
 assert.match(html[2],/Write a message/);
 assert.match(html[3],/CORRESPONDENCE/);
 assert.match(html[4],/TRANSMISSION READY/);
});
test('native tool panels keep all original action elements across identities',()=>{
 const html=identities.map(identity=>renderToStaticMarkup(React.createElement(native.NativeToolPanel,{identity},
  React.createElement('button',{'aria-label':'Mute conversation'},'Mute'))));
 assert.equal(new Set(html).size,5);
 html.forEach(x=>assert.match(x,/aria-label="Mute conversation"/));
 assert.doesNotMatch(html[0],/relay-native-tool-panel/);
});
test('five conversation rows retain the same controls',()=>{
 const html=identities.map(identity=>renderToStaticMarkup(React.createElement(native.NativeConversationRow,{identity},
  React.createElement('button',{'aria-label':'Open chat'},'A conversation'))));
 assert.equal(new Set(html).size,5);
 html.forEach(s=>assert.match(s,/aria-label="Open chat"/));
});
test('unknown identity falls back to Core',()=>{
 assert.equal(native.resolveCommunicationIdentity('unknown'),'core');
 assert.equal(native.resolveCommunicationIdentity('pulse'),'pulse');
 assert.equal(native.resolveCommunicationIdentity(null),'core');
});
test('live thread, list and composer reuse the native primitives',()=>{
 const thread=fs.readFileSync(path.join(root,'src/components/chats/message-thread.tsx'),'utf8');
 const list=fs.readFileSync(path.join(root,'src/components/chats/conversation-list.tsx'),'utf8');
 const composer=fs.readFileSync(path.join(root,'src/components/chats/message-composer.tsx'),'utf8');
 assert.match(thread,/<NativeMessage identity=\{adaptIdentity\}/);
 assert.match(list,/<NativeConversationRow identity=\{identity\}>/);
 assert.match(composer,/<NativeComposer identity=\{identity\}/);
 assert.match(thread,/setMessagePinned/);
 assert.match(composer,/sendMessage/);
});
test('RAVIN native frames preserve message body and attachment DOM',{skip:!process.env.ARROW_RAVIN_SOURCE},()=>{
 const js=fs.readFileSync(path.join(process.env.ARROW_RAVIN_SOURCE,'ravin/public/ravin-shell.js'),'utf8');
 const css=fs.readFileSync(path.join(process.env.ARROW_RAVIN_SOURCE,'ravin/public/arrow-ravin.css'),'utf8');
 assert.doesNotThrow(()=>new Function(js));
 assert.match(js,/function frameNativeMessage/);
 assert.match(js,/function frameNativeHistory/);
 assert.match(js,/function frameNativeComposer/);
 assert.match(js,/article\.replaceChildren/);
 assert.match(js,/frameNativeMessage\(article\)/);
 assert.match(js,/observer|MutationObserver/i);
 for(const id of ['bloom','haven','atelier','pulse']){
  assert.ok(js.includes("identity==='"+id+"'"),id+' DOM composition missing');
  assert.ok(css.includes('data-native-identity="'+id+'"'),id+' styling missing');
 }
});
test('isolated Appearance lab previews messaging without changing preferences',()=>{
 const js=fs.readFileSync(path.join(root,'public/arrow-shell.js'),'utf8');
 assert.match(js,/data-adapt-preview-surface="conversation"/);
 assert.match(js,/data-adapt-preview-surface="home"/);
 assert.match(js,/surface === 'conversation'/);
 assert.match(js,/renderIdentityPreview\(normalized,surface\)/);
 assert.match(js,/applyAdapt\(previewIdentity,true\)/);
 assert.doesNotThrow(()=>new Function(js));
});
