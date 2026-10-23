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

test('enterarrow.com Relay enables full Orbit access', () => {
  assert.match(header, /data-orbit-access="enabled"/);
});

test('Relay loads the shared ARROW shell assets in public and beta', () => {
  assert.match(layout, /arrow-shell\.css/);
  assert.match(layout, /arrow-shell\.js/);
  assert.match(layout, /strategy="afterInteractive"/);
});


test('Relay profile retains account, layout and particle controls without redundant experience picker', () => {
  const profile = fs.readFileSync('src/app/(app)/profile/page.tsx', 'utf8');
  assert.doesNotMatch(profile, /Replay startup animation/);
  assert.doesNotMatch(profile, /<ExperienceControls/);
  for (const control of ['ParticleControls', 'LayoutControls', 'AccountAccess']) assert.ok(profile.includes('<' + control));
  assert.match(profile, /Open ARROW Appearance/);
});

test('ARROW beta Appearance follows theme, preview/apply, then optional color', () => {
  const shell = fs.readFileSync('public/arrow-shell.js', 'utf8');
  const start = shell.indexOf('function renderAppearance()');
  const end = shell.indexOf('function renderSettings()', start);
  assert.ok(start > 0 && end > start, 'shared beta appearance renderer exists');
  const renderer = shell.slice(start, end);
  const theme = renderer.indexOf('arrow-os-theme-choice');
  const preview = renderer.indexOf('data-adapt-preview-stage');
  const apply = renderer.indexOf('data-adapt-preview-apply');
  const color = renderer.indexOf('arrow-os-color-section');
  assert.ok(theme > 0 && theme < preview, 'theme precedes the preview');
  assert.ok(preview < apply && apply < color, 'apply precedes optional color controls');
  assert.match(renderer, /data-custom-hex/, 'custom HEX control remains available');
  assert.match(shell, /state\.panelBody\.scrollTop = 0/, 'reopening appearance begins at the top');
});

test('Bloom beta sidebar collapses to an icon rail without a full-width gutter', () => {
  const shellLayout = fs.readFileSync('src/app/(app)/layout.tsx', 'utf8');
  const styles = fs.readFileSync('public/arrow-shell.css', 'utf8');
  assert.match(shellLayout, /arrow:adaptchange/);
  assert.match(shellLayout, /arrow_os_adapt_v1/);
  assert.match(shellLayout, /DOCK_COLLAPSED_KEY, '1'/);
  assert.ok(styles.includes('data-arrow-adapt="bloom"] .relay-app-shell[data-dock-collapsed="true"]'));
  assert.match(styles, /padding-left:4rem!important/);
});

test('shared ARROW Settings groups common actions, account, workspace, privacy and help', () => {
  const shell = fs.readFileSync('public/arrow-shell.js', 'utf8');
  const start = shell.indexOf('function renderSettings()');
  const end = shell.indexOf('function exportData()', start);
  assert.ok(start > 0 && end > start);
  const settings = shell.slice(start, end);
  for (const label of ['Make ARROW yours.', 'Account & device', 'Workspace', 'Privacy, data & advanced', 'Help & releases']) {
    assert.ok(settings.includes(label), 'Missing Settings section: ' + label);
  }
  for (const action of ['data-settings-open-appearance', 'data-open-notifications', 'data-settings-open-links',
    'data-settings-open-focus', 'data-settings-action="export"', 'data-settings-action="import"',
    'data-settings-action="reset"', 'data-settings-action="signout"']) {
    assert.ok(settings.includes(action), 'Missing Settings action: ' + action);
  }
  assert.match(settings, /arrow-os-settings-more/);
  assert.ok(settings.indexOf('Account & device') < settings.indexOf('Privacy, data & advanced'));
});

test('integrated Orbit release pins the corrected light-mode world', () => {
  const pins = JSON.parse(fs.readFileSync('scripts/arrow-beta-centers.json', 'utf8'));
  assert.match(pins['Resonant-Orbit'], /^[0-9a-f]{40}$/, 'Orbit must be pinned to a full commit SHA');
  assert.notEqual(pins['Resonant-Orbit'], 'f68b683150f427fa7855f3ea0b7fc8390944ae2a', 'do not ship the old invisible-dots revision');
});

test('light mode keeps the beta black-hole event horizon dark', () => {
  const styles = fs.readFileSync('public/arrow-shell.css', 'utf8');
  const start = styles.indexOf('/* Massive cinematic black-hole return');
  const end = styles.indexOf('/* Orbit -> center', start);
  assert.ok(start > 0 && end > start, 'black-hole transition styles are present');
  const blackHole = styles.slice(start, end);
  assert.match(blackHole, /\.arrow-os-blackhole-core\s*\{[^}]*background:\s*#000;/s);
  assert.match(blackHole, /100%\s*\{\s*background:\s*#000;\s*\}/);
  assert.match(blackHole, /\.arrow-os-gravity-vignette\s*\{[^}]*#000 100%/s);
  assert.doesNotMatch(blackHole, /var\(--ui-surface\)/, 'light theme must not whiten the event horizon');
});
