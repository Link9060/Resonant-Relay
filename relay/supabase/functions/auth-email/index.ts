import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED_ORIGINS = new Set([
  'https://resonantrelay.org',
  'https://www.resonantrelay.org',
  'https://link9060.github.io',
]);

const PUBLIC_CALLBACK = 'https://resonantrelay.org/auth/callback/';
const BETA_CALLBACK = 'https://link9060.github.io/Resonant-Relay/auth/callback/';
const EMERGENCY_CALLBACK = 'https://link9060.github.io/Resonant-Relay/emergency/index.html';

function cors(origin: string | null) {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://resonantrelay.org';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '') + 'Aa9!';
}

function emailHtml(link: string, isSignup: boolean, emergency: boolean) {
  const heading = emergency ? 'Open Relay Emergency Mode' : isSignup ? 'Confirm your Relay account' : 'Sign in to Relay';
  const action = emergency ? 'Open Emergency Relay' : isSignup ? 'Confirm account' : 'Sign in to Relay';
  return `<!doctype html><html><body style="margin:0;background:#ffffff;color:#111111;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding-top:40px;padding-right:20px;padding-bottom:40px;padding-left:20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px"><tr><td style="font-size:24px;line-height:32px;font-weight:600;color:#111111">${heading}</td></tr><tr><td style="padding-top:12px;font-size:14px;line-height:22px;color:#555555">Use the secure button below to continue. This link expires shortly and can only be used once.</td></tr><tr><td style="padding-top:24px"><a href="${link}" style="display:inline-block;background-color:#111111;color:#ffffff;text-decoration:none;font-size:14px;line-height:20px;font-weight:600;padding-top:12px;padding-right:18px;padding-bottom:12px;padding-left:18px;border-radius:6px">${action}</a></td></tr><tr><td style="padding-top:24px;font-size:12px;line-height:19px;color:#777777">If you did not request this email, you can ignore it.</td></tr></table></td></tr></table></body></html>`;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const resendKey = Deno.env.get('RESEND_API_KEY');

  if (req.method === 'GET' && new URL(req.url).searchParams.get('health') === '1') {
    return json({ ok: Boolean(supabaseUrl && serviceRole && resendKey) }, 200, origin);
  }

  if (req.method === 'OPTIONS') {
    if (!origin || !ALLOWED_ORIGINS.has(origin)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: cors(origin) });
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, origin);
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return json({ error: 'Origin not allowed.' }, 403, origin);

  if (!supabaseUrl || !serviceRole || !resendKey) {
    console.error('auth-email configuration missing');
    return json({ error: 'Relay email sign-in is temporarily unavailable.' }, 503, origin);
  }

  let payload: { email?: unknown; emergency?: unknown };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid request.' }, 400, origin);
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const emergency = payload.emergency === true && origin === 'https://link9060.github.io';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ error: 'Enter a valid email address.' }, 400, origin);
  }

  const ip = (req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim();
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const [emailHash, ipHash] = await Promise.all([sha256(email), sha256(ip)]);
  const { data: slot, error: slotError } = await admin.rpc('request_auth_email_slot', {
    p_email_hash: emailHash,
    p_ip_hash: ipHash,
  });
  if (slotError) {
    console.error('auth-email rate limiter failed', slotError.message);
    return json({ error: 'Relay email sign-in is temporarily unavailable.' }, 503, origin);
  }
  if (!slot) return json({ error: 'Too many sign-in emails were requested. Try again in a few minutes.' }, 429, origin);

  const { data: existing, error: existingError } = await admin.rpc('auth_email_user_exists', { p_email: email });
  if (existingError) {
    console.error('auth-email user lookup failed', existingError.message);
    return json({ error: 'Relay could not prepare a sign-in email.' }, 503, origin);
  }

  // Emergency Mode is recovery-only: it never creates a new Relay account.
  // Return the same generic success response for unknown addresses so the
  // endpoint does not become an account-enumeration oracle.
  if (emergency && !existing) return json({ ok: true }, 200, origin);

  const normalCallback = origin === 'https://link9060.github.io' ? BETA_CALLBACK : PUBLIC_CALLBACK;
  const callback = emergency ? EMERGENCY_CALLBACK : normalCallback;
  const params = existing
    ? { type: 'magiclink' as const, email, options: { redirectTo: normalCallback } }
    : { type: 'signup' as const, email, password: randomPassword(), options: { redirectTo: normalCallback } };

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink(params);
  if (linkError || !linkData?.properties?.hashed_token || !linkData.properties.verification_type) {
    console.error('auth-email link generation failed', linkError?.message ?? 'missing link properties');
    return json({ error: 'Relay could not prepare a sign-in email.' }, 503, origin);
  }

  const verificationType = linkData.properties.verification_type;
  const link = `${callback}?token_hash=${encodeURIComponent(linkData.properties.hashed_token)}&type=${encodeURIComponent(verificationType)}`;
  const isSignup = verificationType === 'signup';
  const subject = emergency ? 'Open Relay Emergency Mode' : isSignup ? 'Confirm your Relay account' : 'Sign in to Relay';
  const text = `${subject}\n\nOpen this secure Relay link to continue. It expires shortly and can only be used once.\n\n${link}\n\nIf you did not request this email, you can ignore it.`;

  const send = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Relay <noreply@auth.resonantrelay.org>',
      to: [email],
      subject,
      text,
      html: emailHtml(link, isSignup, emergency),
      tags: [{ name: 'purpose', value: emergency ? 'emergency-auth' : 'auth' }],
    }),
  });

  if (!send.ok) {
    console.error('auth-email Resend failure', send.status, await send.text());
    return json({ error: 'Relay could not send the sign-in email.' }, 503, origin);
  }

  return json({ ok: true }, 200, origin);
});
