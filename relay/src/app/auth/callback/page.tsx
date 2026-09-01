'use client';

import { PageLoading } from '@/components/page-loading';
import { appUrl } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';

const LOGIN_PATH = appUrl('/login/');

function goToRelay() {
  window.location.replace(`${window.location.origin}${appUrl('/')}`);
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

      // A previously completed link can still leave a valid browser session.
      // Do not show a failure in that case; just finish entering Relay.
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        goToRelay();
        return;
      }

      const code = params.get('code');
      if (code) {
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (!exchangeError && data.session) {
          goToRelay();
          return;
        }

        console.error('Relay sign-in code exchange failed', exchangeError);
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
