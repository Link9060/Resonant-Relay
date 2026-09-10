'use client';

import { PageLoading } from '@/components/page-loading';
import { appPageUrl, BETA_SITE_URL, IS_BETA, PUBLIC_SITE_URL } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, CheckCircle2, Clock3, FlaskConical, Loader2, LogOut, XCircle } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';

type BetaStatus = {
  approved: boolean;
  approved_at: string | null;
  request_id: string | null;
  request_status: 'pending' | 'approved' | 'declined' | null;
  request_message: string | null;
  response_message: string | null;
  requested_at: string | null;
  reviewed_at: string | null;
};

export default function BetaAccessPage() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [status, setStatus] = useState<BetaStatus | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSignedIn(false);
      setStatus(null);
      setReady(true);
      return;
    }

    setSignedIn(true);
    const [{ data: profile }, { data: access, error: accessError }] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
      supabase.rpc('beta_access_status'),
    ]);

    setDisplayName(profile?.display_name ?? user.email ?? null);
    if (accessError) setError(accessError.message);
    else setStatus((access ?? null) as BetaStatus | null);
    setReady(true);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadStatus();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadStatus]);

  async function submitRequest(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: requestError } = await (createClient() as any).rpc('request_beta_access', {
      p_message: message.trim() || null,
    });
    if (requestError) {
      setError(requestError.message);
      setBusy(false);
      return;
    }
    setMessage('');
    await loadStatus();
    setBusy(false);
  }

  async function signOut() {
    setBusy(true);
    try {
      await createClient().auth.signOut();
      window.location.replace(appPageUrl('/login'));
    } finally {
      setBusy(false);
    }
  }

  if (!IS_BETA) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-7 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-canvas text-ink"><FlaskConical size={20} /></div>
          <h1 className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">Relay Beta</h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">Beta access requests are handled from the Beta site.</p>
          <a href={`${BETA_SITE_URL}/beta-access/`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-canvas">Open Relay Beta <ArrowRight size={15} /></a>
          <div className="mt-4"><a href={`${PUBLIC_SITE_URL}/login/`} className="text-xs text-ink-muted underline underline-offset-4">Back to public Relay</a></div>
        </div>
      </main>
    );
  }

  if (!ready) return <PageLoading label="Checking Beta access…" />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface text-ink"><FlaskConical size={20} /></div>
          <div className="mt-3 inline-flex rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">Private Beta</div>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink">Relay Beta access</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">Beta is where approved testers get early Relay builds before they reach the public release.</p>
        </div>

        <section className="mt-7 rounded-2xl border border-border bg-surface p-6">
          {!signedIn ? (
            <div className="text-center">
              <h2 className="text-base font-semibold text-ink">Sign in before requesting a spot</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">Use the same Relay account you want connected to Beta testing.</p>
              <a href={appPageUrl('/login')} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-canvas">Sign in to Relay Beta <ArrowRight size={15} /></a>
            </div>
          ) : status?.approved ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto text-ink" size={28} />
              <h2 className="mt-3 text-lg font-semibold text-ink">You’re approved for Beta</h2>
              <p className="mt-2 text-sm text-ink-muted">{displayName ? `${displayName}, your account` : 'Your account'} is on the active Beta tester list.</p>
              {status.response_message && <div className="mt-4 rounded-xl border border-border bg-canvas px-4 py-3 text-left text-sm text-ink-muted"><div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Owner message</div><div className="mt-1">{status.response_message}</div></div>}
              <a href={appPageUrl('/space')} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-canvas">Enter Relay Beta <ArrowRight size={15} /></a>
            </div>
          ) : status?.request_status === 'pending' ? (
            <div className="text-center">
              <Clock3 className="mx-auto text-ink" size={27} />
              <h2 className="mt-3 text-lg font-semibold text-ink">Your Beta request is pending</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">Owner review is required before this account can enter Relay Beta.</p>
              {status.request_message && <div className="mt-4 rounded-xl border border-border bg-canvas px-4 py-3 text-left text-sm text-ink-muted"><div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Your request</div><div className="mt-1">{status.request_message}</div></div>}
              {status.requested_at && <div className="mt-3 text-xs text-ink-faint">Requested {new Date(status.requested_at).toLocaleString()}</div>}
            </div>
          ) : (
            <>
              {status?.request_status === 'declined' && (
                <div className="mb-5 rounded-xl border border-border bg-canvas p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink"><XCircle size={16} />Previous request declined</div>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{status.response_message || 'No response message was provided.'}</p>
                </div>
              )}
              <form onSubmit={submitRequest}>
                <label className="block text-xs font-medium text-ink-muted" htmlFor="beta-message">Why do you want to test Relay Beta? <span className="font-normal text-ink-faint">Optional</span></label>
                <textarea id="beta-message" value={message} maxLength={1000} rows={5} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what you’re interested in testing, what device you use, or anything else useful." className="mt-2 w-full resize-none rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted" />
                <div className="mt-1 text-right text-[10px] text-ink-faint">{message.length}/1000</div>
                <button type="submit" disabled={busy} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-canvas disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <FlaskConical size={15} />}Request Beta access</button>
              </form>
            </>
          )}

          {error && <div className="mt-4 rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-red-500">{error}</div>}
        </section>

        {signedIn && (
          <div className="mt-4 flex justify-center"><button type="button" disabled={busy} onClick={() => void signOut()} className="inline-flex min-h-11 items-center gap-2 px-3 text-xs text-ink-muted hover:text-ink"><LogOut size={14} />Sign out</button></div>
        )}
        <div className="mt-2 text-center"><a href={`${PUBLIC_SITE_URL}/`} className="text-xs text-ink-faint underline underline-offset-4">Public Relay</a></div>
      </div>
    </main>
  );
}
