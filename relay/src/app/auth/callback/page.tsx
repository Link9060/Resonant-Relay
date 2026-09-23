'use client';

import { PageLoading } from '@/components/page-loading';
import { appUrl, IS_BETA } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import type { EmailOtpType } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

const LOGIN_PATH = appUrl('/login/');
const EMAIL_OTP_TYPES = new Set<EmailOtpType>(['email', 'magiclink', 'invite', 'recovery', 'email_change']);
const POST_AUTH_NEXT_KEY = 'relay-post-auth-next';

function consumePostAuthNext() {
  try {
    const value = window.localStorage.getItem(POST_AUTH_NEXT_KEY);
    window.localStorage.removeItem(POST_AUTH_NEXT_KEY);
    if (!value || !value.startsWith('/') || value.startsWith('//')) return null;
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

async function goAfterSignIn() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.replace(`${window.location.origin}${LOGIN_PATH}`);
    return;
  }

  if (IS_BETA) {
    const { data: betaAccess, error: betaError } = await supabase.rpc('beta_access_status');
    if (betaError || !betaAccess?.approved) {
      window.location.replace(`${window.location.origin}${appUrl('/beta-access/')}`);
      return;
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('id', user.id)
    .single();

  const next = profile?.onboarding_completed_at ? consumePostAuthNext() : null;
  const destination = profile?.onboarding_completed_at
    ? (next ? appUrl(next) : appUrl(IS_BETA ? '/space/' : '/'))
    : appUrl('/onboarding/');
  window.location.replace(`${window.location.origin}${destination}`);
}

function Callback() {
  const params = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      const supabase = createClient();
      const callbackError = params.get('error_description');
      const code = params.get('code');
      const flowId = params.get('sb_flow_id');
      const tokenHash = params.get('token_hash');
      const otpType = params.get('type') as EmailOtpType | null;

      // Branded Relay auth emails can link straight to this page with a
      // token hash. The user sees resonantrelay.org in the email instead of
      // the raw Supabase project hostname, while verification still happens
      // securely through Supabase Auth in the browser.
      if (tokenHash && otpType && EMAIL_OTP_TYPES.has(otpType)) {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });

        if (!verifyError && data.session) {
          await goAfterSignIn();
          return;
        }

        console.error('Relay email token verification failed', verifyError);
        setError('This sign-in link is no longer usable. Request a fresh link and try again.');
        return;
      }

      if (code) {
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(
            code,
            flowId ? { flowId } : undefined,
          );

        if (!exchangeError && data.session) {
          await goAfterSignIn();
          return;
        }

        console.error('Relay sign-in code exchange failed', exchangeError);
        setError(
          callbackError
            ? decodeURIComponent(callbackError.replaceAll('+', ' '))
            : 'Relay could not finish this sign-in. Request a fresh sign-in and try again from the same Relay site.',
        );
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        await goAfterSignIn();
        return;
      }

      setError(
        callbackError
          ? decodeURIComponent(callbackError.replaceAll('+', ' '))
          : 'This sign-in link is no longer usable. Request a fresh link and open it in the same browser.',
      );
    })();
  }, [params]);

  if (!error) return <PageLoading label="Finishing sign in…" />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <p className="text-sm text-red-500">{error}</p>
        <a href={LOGIN_PATH} className="mt-4 inline-block text-sm text-ink underline">
          Request a new sign-in link
        </a>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Callback />
    </Suspense>
  );
}
