'use client';

import { createClient } from '@/lib/supabase/client';
import { appUrl } from '@/lib/config';
import { FormEvent, useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    setBusy(true);
    setMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}${appUrl('/auth/callback/')}`,
      },
    });

    setMessage(
      error
        ? error.message
        : 'Check your email for a secure sign-in link. You can close this tab after opening it.',
    );
    setBusy(false);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight text-ink">Relay</h1>
        <p className="mt-3 text-sm text-ink-muted">
          The place you open to figure out your day.
        </p>

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

        <form onSubmit={handleEmailSignIn} className="space-y-3 text-left">
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
            disabled={busy}
            className="w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-canvas transition-opacity disabled:opacity-50"
          >
            Email me a sign-in link
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
