/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
const header = fs.readFileSync('src/components/app-header.tsx', 'utf8');

test('Relay beta has exactly one ARROW shell mount', () => {
  const layoutMounts = (layout.match(/data-arrow-os-shell/g) || []).length;
  const headerMounts = (header.match(/data-arrow-os-shell/g) || []).length;

  assert.equal(layoutMounts, 0, 'root layout must not mount a second ARROW control');
  assert.equal(headerMounts, 1, 'app header must own the single ARROW control');
});

test('Relay beta ARROW mount explicitly enables Orbit', () => {
  assert.match(header, /data-arrow-os-shell[^>]+data-orbit-access="enabled"/);
});

test('Relay beta still loads the shared ARROW shell assets', () => {
  assert.match(layout, /arrow-shell\.css/);
  assert.match(layout, /arrow-shell\.js/);
  assert.match(layout, /strategy="afterInteractive"/);
});
