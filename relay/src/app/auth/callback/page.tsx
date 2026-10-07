'use client';

import { PageLoading } from '@/components/page-loading';
import { appUrl, BASE_PATH, IS_BETA, isAllowedArrowReturnPath } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import type { EmailOtpType } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

const LOGIN_PATH = appUrl('/login/');
const ARROW_POST_AUTH_URL_KEY = 'arrow-post-auth-url-v1';
const EMAIL_OTP_TYPES = new Set<string>(['email', 'magiclink', 'invite', 'recovery', 'email_change', 'signup']);

function consumeArrowPostAuthUrl() {
  try {
    const value = window.localStorage.getItem(ARROW_POST_AUTH_URL_KEY) || window.localStorage.getItem('relay-post-auth-next');
    window.localStorage.removeItem('relay-post-auth-next');
    window.localStorage.removeItem(ARROW_POST_AUTH_URL_KEY);
    if (!value) return null;
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    if (!isAllowedArrowReturnPath(parsed.pathname) && !(BASE_PATH && parsed.pathname.startsWith(BASE_PATH + '/'))) return null;
    if (/\/(login|auth|beta-access)(\/|$)/.test(parsed.pathname)) return null;
    return parsed.toString();
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
    if (betaError) throw betaError;
    if (!betaAccess?.approved) {
      window.location.replace(`${window.location.origin}${appUrl('/beta-access/')}`);
      return;
    }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('id', user.id)
    .single();

  if (profileError) throw profileError;
  const arrowDestination = profile?.onboarding_completed_at ? consumeArrowPostAuthUrl() : null;
  if(arrowDestination){window.location.replace(arrowDestination);return;}

  const destination = profile?.onboarding_completed_at ? appUrl(IS_BETA ? '/space/' : '/') : appUrl('/onboarding/');
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
            ? callbackError
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
          ? callbackError
          : 'This sign-in link is no longer usable. Request a fresh link and open it in the same browser.',
      );
    })().catch(() => setError('Sign-in could not finish. Check your connection and request a fresh link.'));
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

