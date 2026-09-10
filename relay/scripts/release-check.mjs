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
  'supabase/migrations/0041_secure_push_dispatch.sql',
  'supabase/migrations/0042_security_function_grant_cleanup.sql',
  'supabase/migrations/0043_least_privilege_table_grants.sql',
]) {
  if (!existsSync(join(root, migration))) failures.push(`${migration}: missing release migration`);
}

requireText('supabase/functions/account-center/index.ts', 'https://resonantrelay.org', 'production origin');
requireText('supabase/functions/mail-hub/index.ts', 'https://resonantrelay.org', 'production origin');
requireText('supabase/functions/mail-hub/index.ts', 'return_origin', 'OAuth return-origin state');
requireText('supabase/functions/google-hub/index.ts', 'https://resonantrelay.org', 'production origin');
requireText('supabase/functions/google-hub/index.ts', 'return_origin', 'OAuth return-origin state');
requireText('supabase/functions/push-dispatch/index.ts', 'X-Relay-Dispatch-Secret', 'protected push dispatch');
forbidText('public/sw.js', "const BASE = '/Resonant-Relay'", 'hardcoded beta service-worker base');
requireText('public/sw.js', 'self.registration.scope', 'scope-derived service-worker base');

const clientSecretNames = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'MICROSOFT_OAUTH_CLIENT_SECRET',
  'VAPID_PRIVATE_KEY',
  'RESEND_API_KEY',
];

const literalSecretPatterns = [
  ['Supabase secret key', /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g],
  ['Google OAuth client secret', /\bGOCSPX-[A-Za-z0-9_-]{20,}\b/g],
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g],
  ['OpenAI-style secret key', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ['Resend API key', /\bre_[A-Za-z0-9]{20,}\b/g],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['private key PEM', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
];

const dangerousClientPatterns = [
  ['dangerouslySetInnerHTML', /\bdangerouslySetInnerHTML\b/],
  ['innerHTML assignment', /\binnerHTML\s*=/],
  ['outerHTML assignment', /\bouterHTML\s*=/],
  ['eval()', /\beval\s*\(/],
  ['new Function()', /\bnew\s+Function\s*\(/],
  ['document.write()', /\bdocument\.write\s*\(/],
  ['javascript: URL', /(?:href|src)\s*=\s*["'`]javascript:/i],
];

function isClientSource(source) {
  const firstMeaningfulLine = source
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return firstMeaningfulLine === "'use client';" || firstMeaningfulLine === '"use client";';
}

function decodeJwtPayload(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function scanForLiteralSecrets(rel, source) {
  for (const [label, pattern] of literalSecretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) failures.push(`${rel}: contains a real-looking ${label}`);
  }

  const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
  for (const token of source.match(jwtPattern) ?? []) {
    const payload = decodeJwtPayload(token);
    if (payload?.role === 'service_role') {
      failures.push(`${rel}: contains a legacy Supabase service_role JWT`);
      break;
    }
  }
}

function shouldScanText(name) {
  return /\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|sql|toml|ya?ml|css|html)$/.test(name) || name.startsWith('.env');
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name === 'out' || name === '.git') continue;
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path);
      continue;
    }
    if (!shouldScanText(name)) continue;

    const rel = relative(root, path);
    const source = readFileSync(path, 'utf8');
    scanForLiteralSecrets(rel, source);

    if (!/\.(ts|tsx|js|jsx)$/.test(name) || !isClientSource(source)) continue;
    for (const secretName of clientSecretNames) {
      if (source.includes(secretName)) failures.push(`${rel}: server secret name appears in client source (${secretName})`);
    }
    for (const [label, pattern] of dangerousClientPatterns) {
      if (pattern.test(source)) failures.push(`${rel}: high-risk browser sink requires security review (${label})`);
    }
  }
}

walk(root);

if (failures.length) {
  console.error('Relay release checks failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Relay release checks passed.');
