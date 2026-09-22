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
  assert.ok(paletteRules.length >= 20);
  for (const rule of paletteRules) {
    assert.doesNotMatch(rule, /--canvas|--surface|--ink|--border/);
    assert.match(rule, /--accent:/);
    assert.match(rule, /--accent-secondary:/);
  }
});

test('duo accents blend two colors without tinting Relay surfaces', () => {
  for (const palette of ['aurora', 'ember', 'tide']) {
    assert.match(modeSource, new RegExp(`id: '${palette}'`));
  }
  assert.match(css, /linear-gradient\(120deg, rgb\(var\(--accent\)\), rgb\(var\(--accent-secondary\)\)\)/);
});

test('legacy palettes migrate while pre-auth visuals use account-safe defaults', () => {
  for (const migration of ["lavender: 'violet'", "ocean: 'cyan'"]) {
    assert.match(modeSource, new RegExp(migration));
  }
  assert.match(layout, /relayExperience='flow'/);
  assert.match(layout, /relayPalette='monochrome'/);
  assert.match(layout, /relayVisualPrefsReady='false'/);
});

test('Lock-In persists separately and suppresses attention effects', () => {
  assert.match(modeSource, /LOCK_IN_KEY/);
  assert.match(modeSource, /saveLockIn/);
  assert.match(css, /data-relay-lock-in='true'/);
  assert.match(css, /relay-attention-signal/);
});

test('Lucid keeps the particle cloud behind transparent refractive panels', () => {
  assert.match(css, /data-relay-experience='lucid'[\s\S]+background-color: rgb\(var\(--canvas\) \/ \.46\)/);
  assert.match(css, /relay-primary-cluster:has/);
  assert.match(css, /backdrop-filter: blur\(18px\) saturate\(1\.6\) contrast\(1\.08\)/);
  assert.match(layout, /relayLockIn/);
});
