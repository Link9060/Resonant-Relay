/* eslint-disable @typescript-eslint/no-require-imports -- JSDOM browser regression tests use CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const src = fs.readFileSync('public/arrow-whats-new.js','utf8');
const shared = fs.readFileSync('public/arrow-shell.js','utf8');
const styles = fs.readFileSync('public/arrow-shell.css','utf8');
const release = JSON.parse(fs.readFileSync('public/arrow-release-log.json','utf8'));

test('ARROW owns one release log with the complete Relay history',()=>{
  assert.ok(release.current.title.includes('ARROW'));
  assert.equal(release.history.length,11);
  assert.equal(release.history[0].version,'1.1');
  assert.equal(release.history.at(-1).version,'1.0.0');
  assert.match(shared,/controlButton\('whatsnew', 'What’s New'\)/);
  assert.match(shared,/function renderWhatsNew/);
  assert.match(shared,/function openTray/);
  assert.match(styles,/arrow-release-flight-dot/);
  assert.match(styles,/arrow-release-absorb/);
  assert.match(styles,/prefers-reduced-motion/);
});
test('the old Relay-only sidebar action and modal are unmounted',()=>{
  const dock=fs.readFileSync('src/components/dock.tsx','utf8');
  assert.doesNotMatch(dock,/<WhatsNew\b/);
  assert.doesNotMatch(dock,/OPEN_WHATS_NEW_EVENT/);
  assert.doesNotMatch(dock,/aria-label="What’s New"/);
});
test('an announcement appears once per signed-in account, closes into ARROW, and preserves prior releases',async()=>{
  const dom=new JSDOM('<div data-arrow-os-shell><button data-arrow-panel="whatsnew">What’s New</button></div>',{
    url:'https://enterarrow.com/orbit/',pretendToBeVisual:true,runScripts:'outside-only'
  });
  const w=dom.window;
  let user='owner-1',openCount=0,puts=0;
  const meta=new Map();
  w.matchMedia=()=>({matches:true,addEventListener(){}});
  w.AbortSignal.timeout=AbortSignal.timeout;
  w.BroadcastChannel=class {postMessage(){}addEventListener(){}close(){}};
  w.ArrowOS={
    getSession:()=>({user:{id:user},access_token:'fake-token',expires_at:Date.now()/1000+3600}),
    openTray:()=>{openCount++;}
  };
  w.fetch=async(input,options={})=>{
    const url=String(input);
    if(url.includes('arrow-release-log.json'))return {ok:true,json:async()=>release};
    if(url.includes('/auth/v1/user')&&options.method==='PUT') {
      puts++;const payload=JSON.parse(options.body);meta.set(user,payload.data.arrow_whats_new_seen_public);
      return {ok:true,json:async()=>({id:user,user_metadata:{arrow_whats_new_seen_public:meta.get(user)}})};
    }
    if(url.includes('/auth/v1/user'))return {ok:true,status:200,json:async()=>({
      id:user,user_metadata:{arrow_whats_new_seen_public:meta.get(user)}
    })};
    throw Error('Unexpected mock fetch: '+url);
  };
  try{
    w.eval(src);
    await w.ArrowWhatsNew.checkOnce();
    assert.equal(w.document.querySelectorAll('[role="dialog"]').length,1);
    assert.match(w.document.body.textContent,/Workspace Update/);
    w.document.querySelector('[data-arrow-release-close]').click();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(w.document.querySelectorAll('[role="dialog"]').length,0);
    assert.equal(openCount,1);
    assert.equal(puts,1);
    assert.equal(w.localStorage.getItem('arrow-whats-new:arrow_whats_new_seen_public:owner-1:'+release.current.id),'1');
    await w.ArrowWhatsNew.checkOnce();
    assert.equal(w.document.querySelectorAll('[role="dialog"]').length,0);
    const panel=w.document.createElement('div');w.document.body.append(panel);
    await w.ArrowWhatsNew.renderInto(panel);
    assert.equal(panel.querySelectorAll('.arrow-release-list details').length,11);
    user='owner-2';
    await w.ArrowWhatsNew.checkOnce();
    assert.equal(w.document.querySelectorAll('[role="dialog"]').length,1,'new user gets own announcement');
    w.document.querySelector('[data-arrow-release-close]').click();
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(puts,2);
  } finally {dom.window.close();}
});
test('release script supports beta/public URLs and records seen state server-side',()=>{
  assert.match(src,/Resonant-Relay\/arrow/);
  assert.match(src,/\/auth\/v1\/user/);
  assert.match(src,/method:'PUT'/);
  assert.match(src,/arrow_whats_new_seen_public/);
  assert.match(src,/arrow_whats_new_seen_beta/);
  assert.match(src,/data-arrow-panel="whatsnew"/);
  assert.doesNotMatch(src,/localStorage\.setItem\('relay-whats-new-seen-version'/);
});
