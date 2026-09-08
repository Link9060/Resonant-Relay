/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Exercise the actual sound component's registered click listener with a
// claimed navigation event. No browser/account/session is needed for this test.
function setup() {
  const listeners = new Map();
  const scheduled = [];
  class Element {
    href = 'https://relay.test/chats/';
    target = '';
    closest(selector) { return selector.includes('data-relay-sound') ? null : this; }
    getAttribute() { return null; }
    hasAttribute() { return false; }
  }
  class Audio { play() { return Promise.resolve(); } pause() {} }
  const window = { location: {href:'https://relay.test/',origin:'https://relay.test'}, setTimeout:callback=>scheduled.push(callback) };
  const document = {addEventListener:(name,callback,capture)=>listeners.set(name,{callback,capture})};
  const output = ts.transpileModule(fs.readFileSync('src/components/ui-sound-effects.tsx','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const exported = {};
  const requireStub = name => name === 'react' ? {useEffect:effect=>effect()} : {BASE_PATH:''};
  new Function('require','exports','document','window','Audio','Element',output)(requireStub,exported,document,window,Audio,Element);
  exported.UiSoundEffects();
  const event = {target:new Element(),button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true}};
  return {listeners,scheduled,event};
}
test('sound handler runs after workspace navigation, not during capture',()=>{
  const s=setup(); assert.notEqual(s.listeners.get('click').capture,true);
});
test('claimed app navigation never schedules a full page reload',()=>{
  const s=setup(); s.event.defaultPrevented=true; s.listeners.get('click').callback(s.event); assert.equal(s.scheduled.length,0);
});
test('ordinary unclaimed links retain the existing sound head start',()=>{
  const s=setup(); s.listeners.get('click').callback(s.event); assert.equal(s.scheduled.length,1); assert.equal(s.event.defaultPrevented,true);
});
