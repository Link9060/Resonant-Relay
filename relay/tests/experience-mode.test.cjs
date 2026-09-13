/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const modeSource = fs.readFileSync(path.join(root, 'src/lib/experience-mode.ts'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/app/experience.css'), 'utf8');
const layout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8');

test('beta exposes every named Relay experience', () => {
  for (const mode of ['flow', 'still', 'nexus', 'aura', 'slate', 'spark', 'lucid']) {
    assert.match(modeSource, new RegExp(`id: '${mode}'`));
    assert.match(css, new RegExp(`data-relay-experience='${mode}'`));
  }
});

test('accent palettes only override accent tokens', () => {
  const paletteRules = css.match(/html(?:\.dark)?\[data-relay-palette='[^']+'\]\s*\{[^}]+\}/g) || [];
  assert.ok(paletteRules.length >= 14);
  for (const rule of paletteRules) {
    assert.doesNotMatch(rule, /--canvas|--surface|--ink|--border/);
    assert.match(rule, /--accent:/);
  }
});

test('legacy beta preferences migrate without losing users choices', () => {
  for (const migration of ["relay:'flow'", "minimal:'still'", "scifi:'nexus'", "lavender:'violet'", "ocean:'cyan'"]) {
    assert.match(layout, new RegExp(migration));
  }
});

test('Lock-In persists separately and suppresses attention effects', () => {
  assert.match(modeSource, /LOCK_IN_KEY/);
  assert.match(modeSource, /saveLockIn/);
  assert.match(css, /data-relay-lock-in='true'/);
  assert.match(css, /relay-attention-signal/);
});
