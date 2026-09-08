import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const failures = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function requireText(path, text, label = text) {
  const value = read(path);
  if (!value.includes(text)) failures.push(`${path}: missing ${label}`);
}

function forbidText(path, text, label = text) {
  const value = read(path);
  if (value.includes(text)) failures.push(`${path}: contains forbidden ${label}`);
}

for (const migration of [
  'supabase/migrations/0032_public_release_hardening.sql',
  'supabase/migrations/0033_oauth_return_origins.sql',
]) {
  if (!existsSync(join(root, migration))) failures.push(`${migration}: missing release migration`);
}

requireText('supabase/functions/account-center/index.ts', 'https://resonantrelay.org', 'production origin');
requireText('supabase/functions/mail-hub/index.ts', 'https://resonantrelay.org', 'production origin');
requireText('supabase/functions/mail-hub/index.ts', 'return_origin', 'OAuth return-origin state');
requireText('supabase/functions/google-hub/index.ts', 'https://resonantrelay.org', 'production origin');
requireText('supabase/functions/google-hub/index.ts', 'return_origin', 'OAuth return-origin state');
forbidText('public/sw.js', "const BASE = '/Resonant-Relay'", 'hardcoded beta service-worker base');
requireText('public/sw.js', 'self.registration.scope', 'scope-derived service-worker base');

const clientSecretPatterns = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'MICROSOFT_OAUTH_CLIENT_SECRET',
  'VAPID_PRIVATE_KEY',
];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walk(path);
    else if (/\.(ts|tsx|js|jsx)$/.test(name)) {
      const rel = relative(root, path);
      const source = readFileSync(path, 'utf8');
      for (const pattern of clientSecretPatterns) {
        if (source.includes(pattern)) failures.push(`${rel}: server secret name appears in client source (${pattern})`);
      }
    }
  }
}

walk(join(root, 'src'));

if (failures.length) {
  console.error('Relay release checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Relay release checks passed.');
