/* eslint-disable @typescript-eslint/no-require-imports -- Node regression tests use CommonJS. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const shell = fs.readFileSync('public/arrow-shell.js', 'utf8');
const quick = fs.readFileSync('public/arrow-quick-ravin.js', 'utf8');
const css = fs.readFileSync('public/arrow-shell.css', 'utf8');
const packageScript = fs.readFileSync('scripts/build-arrow-beta.mjs', 'utf8');
const pins = JSON.parse(fs.readFileSync('scripts/arrow-beta-centers.json', 'utf8'));

test('ARROW quick chat is syntactically valid and packaged in the integrated beta', () => {
  assert.doesNotThrow(() => new vm.Script(quick, {filename:'arrow-quick-ravin.js'}));
  assert.doesNotThrow(() => new vm.Script(shell, {filename:'arrow-shell.js'}));
  assert.match(packageScript,/arrow-quick-ravin\.js/);
  assert.match(shell,/openQuickRavin/);
  assert.match(shell,/getSession:readArrowSession/);
  assert.match(shell,/refreshSession:refreshArrowSession/);
});
test('chat is authenticated and sends conversation context to the RAVIN streaming API', () => {
  assert.match(quick,/\/api\/v2\/chat\/stream/);
  assert.match(quick,/Authorization:'Bearer '/);
  assert.match(quick,/conversation_id:S\.conversation/);
  assert.match(quick,/surface:S\.module/);
  assert.match(quick,/S\.owner/);
  assert.match(quick,/event==='token'/);
  assert.match(quick,/event==='done'/);
  assert.match(quick,/event==='error'/);
  assert.doesNotMatch(quick,/innerHTML\s*\+=?\s*data\.reply/);
});
test('chat window offers accessible dock controls and all eight resize handles', () => {
  for(const side of ['top','right','bottom','left']) {
    assert.match(quick, new RegExp('data-dock="'+side+'"'));
  }
  for(const side of ['n','e','s','w','nw','ne','se','sw']) {
    assert.match(quick, new RegExp('data-resize="'+side+'"'));
  }
  assert.match(quick,/pointerDown/);
  assert.match(quick,/pointerMove/);
  assert.match(quick,/pointerUp/);
  assert.match(css,/data-ravin-layout="push"/);
  assert.match(css,/data-ravin-docked="right"/);
  assert.match(css,/arrow-dock-wave/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
test('staff workspace uses its available height rather than legacy capped quick-panel height', () => {
  assert.match(css,/\.arrow-os-panel\.arrow-staff-page > \.arrow-os-panel-body\s*\{[^}]*max-height:none!important/s);
  assert.match(css,/\.arrow-os-panel\.arrow-staff-page \.arrow-staff-content\s*\{[^}]*overflow-y:auto/s);
  assert.match(shell,/dataset\.exiting='true'/);
});
test('integration preserves exact independent module pins', () => {
  for(const key of ['Resonant-Orbit','Resonant-Waypoint','Resonant-Field','Project-R.A.V.I.N.-1.1']) {
    assert.match(pins[key],/^[0-9a-f]{40}$/);
  }
});
