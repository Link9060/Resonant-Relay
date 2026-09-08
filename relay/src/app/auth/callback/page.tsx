'use client';

import { PageLoading } from '@/components/page-loading';
import { appUrl } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

const LOGIN_PATH = appUrl('/login/');

async function goAfterSignIn() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.replace(`${window.location.origin}${LOGIN_PATH}`);
    return;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed_at')
    .eq('id', user.id)
    .single();

  const destination = profile?.onboarding_completed_at ? appUrl('/') : appUrl('/onboarding/');
  window.location.replace(`${window.location.origin}${destination}`);
}

function Callback() {
  const params = useSearchParams();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auth codes are one-time values. Guarding the effect prevents React from
    // accidentally attempting the same exchange twice.
    if (started.current) return;
    started.current = true;

    void (async () => {
      const supabase = createClient();
      const callbackError = params.get('error_description');
      const code = params.get('code');
      const flowId = params.get('sb_flow_id');

      // A fresh OAuth/magic-link code always wins over any session already in
      // this browser. Relay owns the PKCE exchange on this route; the browser
      // client has detectSessionInUrl disabled so this code is exchanged once.
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

      // Only reuse an existing session when this callback does not contain a
      // new code. This still supports revisiting a completed callback URL.
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
