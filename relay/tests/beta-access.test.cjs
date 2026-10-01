const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const source=readFileSync(require('node:path').join(__dirname,'../public/arrow-beta-guard.js'),'utf8');
async function check({session,approved=true,host='link9060.github.io',failure=false}={}) {
  const values=new Map(session?[['sb-cnorozrjugxpanpfmssa-auth-token',JSON.stringify(session)]]:[]);
  const redirects=[];const calls=[];const document={documentElement:{style:{}},body:{replaceChildren(){}},createElement:()=>({style:{},append(){}})};
  vm.runInNewContext(source,{location:{hostname:host,pathname:'/Resonant-Relay/arrow/orbit/',href:'https://link9060.github.io/Resonant-Relay/arrow/orbit/',replace:url=>redirects.push(url)},localStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)},document,AbortController,setTimeout,clearTimeout,fetch:async(url)=>{calls.push(url);if(failure)throw Error('offline');return {ok:true,status:200,json:async()=>({approved})};}});
  await new Promise(resolve=>setImmediate(resolve));return {values,redirects,calls,document};
}
test('nested beta saves its exact destination and uses beta sign-in',async()=>{
  const result=await check();assert.deepEqual(result.redirects,['/Resonant-Relay/login/']);assert.equal(result.values.get('arrow-post-auth-url-v1'),'https://link9060.github.io/Resonant-Relay/arrow/orbit/');assert.equal(result.calls.length,0);
});
test('a valid session still needs approved beta access',async()=>{
  const result=await check({session:{access_token:'test',expires_at:Date.now()/1000+3600},approved:false});assert.deepEqual(result.redirects,['/Resonant-Relay/beta-access/']);assert.equal(result.calls.length,2);
});
test('approved beta reveals the app; network failures leave a visible recovery screen',async()=>{
  const session={access_token:'test',expires_at:Date.now()/1000+3600};
  for(const failure of [false,true]){const result=await check({session,failure});assert.equal(result.document.documentElement.style.visibility,'');assert.equal(result.redirects.length,0);}
});
test('beta guard does not affect the public site',async()=>{
  const result=await check({host:'enterarrow.com'});assert.equal(result.calls.length,0);assert.equal(result.redirects.length,0);assert.equal(result.document.documentElement.style.visibility,undefined);
});
