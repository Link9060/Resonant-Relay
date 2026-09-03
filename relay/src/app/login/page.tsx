'use client';

import { createClient } from '@/lib/supabase/client';
import { appPageUrl, appUrl, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/config';
import { FormEvent, useEffect, useState } from 'react';

const EMAIL_RATE_LIMIT_COOLDOWN_MS = 60 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;

function retryTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  useEffect(() => {
    let active = true;

    void fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((settings) => {
        if (active) setGoogleEnabled(settings?.external?.google === true);
      })
      .catch(() => {
        // Email sign-in remains available if provider discovery is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!retryAfter) return;

    const timer = window.setTimeout(() => {
      setRetryAfter(null);
      setMessage(null);
    }, Math.max(0, retryAfter - Date.now()) + 250);

    return () => window.clearTimeout(timer);
  }, [retryAfter]);

  async function handleGoogleSignIn() {
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${appUrl('/auth/callback/')}`,
        // Identity only — no Calendar/Gmail scopes here. Those are requested
        // later, only when the student actually connects those features.
        scopes: 'openid email profile',
      },
    });
    if (error) {
      setMessage('Google sign-in is not configured yet. Use the email option below.');
      setBusy(false);
    }
  }

  async function handleEmailSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (retryAfter) {
      setMessage(
        `Relay has temporarily reached its sign-in email limit. Try again after ${retryTime(retryAfter)}.`,
      );
      return;
    }

    setBusy(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}${appUrl('/auth/callback/')}`,
      },
    });

    if (error) {
      const isEmailLimit =
        error.code === 'over_email_send_rate_limit' ||
        error.message.toLowerCase().includes('email rate limit');
      const isRateLimit = error.status === 429 || isEmailLimit;

      if (isRateLimit) {
        const cooldown = isEmailLimit
          ? EMAIL_RATE_LIMIT_COOLDOWN_MS
          : REQUEST_COOLDOWN_MS;
        const nextAttempt = Date.now() + cooldown;

        setRetryAfter(nextAttempt);
        setMessage(
          isEmailLimit
            ? `Relay has temporarily reached its sign-in email limit. Try again after ${retryTime(nextAttempt)}.`
            : `That email was requested too recently. Try again after ${retryTime(nextAttempt)}.`,
        );
      } else {
        setMessage(`Relay couldn't send the sign-in email: ${error.message}`);
      }
    } else {
      setRetryAfter(null);
      setMessage(
        'Sign-in link sent. Check your inbox and spam folder, then open the newest Relay email in this browser.',
      );
    }

    setBusy(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight text-ink">Relay</h1>
        <p className="mt-3 text-sm text-ink-muted">
          The place you open to figure out your day.
        </p>

        {googleEnabled && (
          <>
            <button
              onClick={handleGoogleSignIn}
              disabled={busy}
              className="mt-10 flex w-full items-center justify-center gap-3 rounded-md border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="my-5 flex items-center gap-3 text-xs text-ink-faint" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        <form
          onSubmit={handleEmailSignIn}
          className={`${googleEnabled ? '' : 'mt-10 '}space-y-3 text-left`}
        >
          <label htmlFor="email" className="block text-xs font-medium text-ink-muted">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-ink-muted"
          />
          <button
            type="submit"
            disabled={busy || Boolean(retryAfter)}
            className="w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-canvas transition-opacity disabled:opacity-50"
          >
            {retryAfter
              ? `Try again after ${retryTime(retryAfter)}`
              : 'Email me a sign-in link'}
          </button>
        </form>

        {message && (
          <p role="status" className="mt-4 text-sm text-ink-muted">
            {message}
          </p>
        )}

        <p className="mt-6 text-xs text-ink-faint">
          You&apos;ll get a Relay Number as soon as you sign in — that&apos;s how people find you.
        </p>
        <p className="mt-4 text-[11px] text-ink-faint">By continuing, you agree to Relay&apos;s <a href={appPageUrl('/terms')} className="underline underline-offset-2">Terms</a> and acknowledge the <a href={appPageUrl('/privacy')} className="underline underline-offset-2">Privacy Policy</a>.</p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.9v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.16.29-1.7V4.97H.9A9 9 0 0 0 0 9c0 1.45.35 2.83.9 4.03l3.05-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .9 4.97l3.05 2.33C4.66 5.17 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
