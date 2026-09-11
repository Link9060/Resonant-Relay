const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('dock keeps notes separate from to do', () => {
  const source = read('src/components/dock.tsx');
  assert.match(source, /href: '\/todo'/);
  assert.match(source, /href: '\/notes'/);
});

test('existing beta page transition system remains intact', () => {
  const source = read('src/lib/workspace-transition.ts');
  assert.match(source, /PANEL_CLOSE_MS = 640/);
  assert.match(source, /PANEL_OPEN_MS = 700/);
  assert.match(source, /particles\('open'\)/);
  assert.match(source, /particles\('close'\)/);
});
