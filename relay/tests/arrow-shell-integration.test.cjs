/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
const header = fs.readFileSync('src/components/app-header.tsx', 'utf8');

test('Relay has exactly one ARROW shell mount', () => {
  const layoutMounts = (layout.match(/data-arrow-os-shell/g) || []).length;
  const headerMounts = (header.match(/data-arrow-os-shell/g) || []).length;

  assert.equal(layoutMounts, 0, 'root layout must not mount a second ARROW control');
  assert.equal(headerMounts, 1, 'app header must own the single ARROW control');
});

test('Relay uses full Orbit in beta and Relay-only Orbit in public', () => {
  assert.match(header, /data-orbit-access=\{IS_BETA \? 'enabled' : 'relay-only'\}/);
});

test('Relay loads the shared ARROW shell assets in public and beta', () => {
  assert.match(layout, /arrow-shell\.css/);
  assert.match(layout, /arrow-shell\.js/);
  assert.match(layout, /strategy="afterInteractive"/);
});


test('Relay profile does not expose retired startup or particle-transition controls', () => {
  const profile = fs.readFileSync('src/app/(app)/profile/page.tsx', 'utf8');
  assert.doesNotMatch(profile, /Replay startup animation/);
  assert.doesNotMatch(profile, /<ParticleControls/);
});
