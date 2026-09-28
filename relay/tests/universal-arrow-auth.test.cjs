/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Relay uses the universal ARROW browser session', () => {
  const source = fs.readFileSync('src/lib/supabase/client.ts', 'utf8');
  assert.match(source, /@supabase\/supabase-js/);
  assert.match(source, /sb-cnorozrjugxpanpfmssa-auth-token/);
  assert.match(source, /persistSession:\s*true/);
  assert.match(source, /autoRefreshToken:\s*true/);
  assert.doesNotMatch(source, /createBrowserClient/);
});

test('Relay redirects missing sessions through the ARROW front door', () => {
  const source = fs.readFileSync('src/app/(app)/layout.tsx', 'utf8');
  assert.match(source, /https:\/\/enterarrow\.com\//);
  assert.match(source, /searchParams\.set\('next', requested\)/);
  assert.match(source, /https:\/\/enterarrow\.com\/signout\//);
});

test('Relay profile sign out uses universal ARROW sign out', () => {
  const source = fs.readFileSync('src/components/profile/sign-out-button.tsx', 'utf8');
  assert.match(source, /https:\/\/enterarrow\.com\/signout\//);
});
