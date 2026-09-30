/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
const header = fs.readFileSync('src/components/app-header.tsx', 'utf8');
const config = fs.readFileSync('src/lib/config.ts', 'utf8');
const nextConfig = fs.readFileSync('next.config.js', 'utf8');
const callback = fs.readFileSync('src/app/auth/callback/page.tsx', 'utf8');
const dock = fs.readFileSync('src/components/dock.tsx', 'utf8');

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


test('Relay profile does not expose retired startup or particle-transition controls', () => {
  const profile = fs.readFileSync('src/app/(app)/profile/page.tsx', 'utf8');
  assert.doesNotMatch(profile, /Replay startup animation/);
  assert.doesNotMatch(profile, /<ParticleControls/);
});


test('Relay separates beta status from ARROW integration mode', () => {
  assert.match(config, /ARROW_INTEGRATION_ENABLED/);
  assert.match(config, /isArrowHosted \? '\/relay' : ''/);
  assert.match(nextConfig, /deployTarget === 'arrow'/);
  assert.match(nextConfig, /isArrowHosted \? '\/relay' : ''/);
});

test('ARROW-integrated Relay keeps the shared shell and focused navigation', () => {
  assert.match(layout, /ARROW_INTEGRATION_ENABLED/);
  assert.match(header, /ARROW_INTEGRATION_ENABLED\?<div data-arrow-os-shell/);
  assert.match(dock, /ARROW_INTEGRATION_ENABLED \? RELAY_DESKTOP_DOCK_ITEMS/);
});

test('Relay auth callback accepts the configured ARROW return-path contract', () => {
  assert.match(callback, /isAllowedArrowReturnPath\(parsed\.pathname\)/);
  assert.match(config, /'\/orbit', '\/relay', '\/ravin', '\/atlas', '\/waypoint'/);
});
