/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('src/lib/workspace-transition.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exportsObject = {};
new Function('exports', source)(exportsObject);
const {createWorkspaceTransition, PANEL_CLOSE_MS, PANEL_OPEN_MS} = exportsObject;
function setup({reduced=false, path='/'}={}) {
  let now=0, serial=0, phase;
  const pending=new Map(), navigations=[], recoveries=[], phases=[];
  const controller=createWorkspaceTransition({
    current:()=>path, landing:p=>p==='/space/', reduced:()=>reduced,
    phase:p=>{phase=p;phases.push(p)}, particles:()=>{},
    navigate:p=>navigations.push(p), recover:p=>recoveries.push(p),
    schedule:(cb,ms)=>{const id=++serial;pending.set(id,{cb,at:now+ms});return id},cancel:id=>pending.delete(id)
  });
  function advance(ms) {
    const end=now+ms;
    for(;;){const next=[...pending].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;pending.delete(next[0]);now=next[1].at;next[1].cb()}
    now=end;
  }
  controller.reveal();advance(PANEL_OPEN_MS);
  return {controller,advance,navigations,recoveries,phases,pending,get phase(){return phase},commit:p=>{path=p;controller.committed()}};
}
test('rapid clicks during exit navigate only to the last requested tab',()=>{const s=setup();s.controller.request('/chats/');s.controller.request('/todo/');s.controller.request('/calendar/');s.advance(PANEL_CLOSE_MS);assert.deepEqual(s.navigations,['/calendar/']);s.commit('/calendar/');s.advance(PANEL_OPEN_MS);assert.equal(s.phase,'open')});
test('a destination queued during navigation commits without exposing the obsolete page',()=>{const s=setup();s.controller.request('/chats/');s.advance(PANEL_CLOSE_MS);s.controller.request('/todo/');s.commit('/chats/');assert.deepEqual(s.navigations,['/chats/','/todo/']);assert.equal(s.phase,'hidden');s.commit('/todo/');s.advance(PANEL_OPEN_MS);assert.equal(s.phase,'open')});
test('return to current tab during exit cancels navigation and restores controls',()=>{const s=setup();s.controller.request('/chats/');s.controller.request('/');s.advance(PANEL_CLOSE_MS+PANEL_OPEN_MS);assert.deepEqual(s.navigations,[]);assert.equal(s.phase,'open')});
test('landing closes content; opening from landing has no redundant exit delay',()=>{const s=setup();s.controller.request('/space/');s.advance(PANEL_CLOSE_MS);s.commit('/space/');assert.equal(s.phase,'hidden');s.controller.request('/todo/');assert.deepEqual(s.navigations,['/space/','/todo/'])});
test('history navigation cancels the delayed requested route',()=>{const s=setup();s.controller.request('/chats/');s.controller.historyChanged();s.commit('/calendar/');s.advance(10000);assert.deepEqual(s.navigations,[]);assert.deepEqual(s.recoveries,[]);assert.equal(s.phase,'open')});
test('disposal prevents navigation and stuck watchdog redirects after unmount',()=>{const s=setup();s.controller.request('/chats/');s.controller.dispose();s.advance(10000);assert.deepEqual(s.navigations,[]);assert.equal(s.pending.size,0)});
test('slow route fallback uses the last destination; success cancels it',()=>{const s=setup();s.controller.request('/chats/');s.advance(PANEL_CLOSE_MS);s.controller.request('/todo/');s.advance(8000);assert.deepEqual(s.recoveries,['/todo/']);const t=setup();t.controller.request('/chats/');t.advance(PANEL_CLOSE_MS);t.commit('/chats/');t.advance(10000);assert.deepEqual(t.recoveries,[])});
test('reduced motion navigates immediately and releases page controls on commit',()=>{const s=setup({reduced:true});s.controller.request('/todo/');assert.deepEqual(s.navigations,['/todo/']);s.commit('/todo/');s.advance(0);assert.equal(s.phase,'open')});
