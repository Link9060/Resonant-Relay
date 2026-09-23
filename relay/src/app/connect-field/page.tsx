'use client';

import { appPageUrl } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Network } from 'lucide-react';
import { useEffect, useState } from 'react';

const FIELD_URL = 'https://link9060.github.io/Resonant-Field/';

export default function ConnectFieldPage() {
  const [message, setMessage] = useState('Checking your Relay account…');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();

      if (!active) return;
      if (!user) {
        const next = '/connect-field/';
        window.location.replace(`${appPageUrl('/login')}?next=${encodeURIComponent(next)}`);
        return;
      }

      setMessage('Connecting Relay to Field…');
      const { data, error } = await supabase.functions.invoke('field-account-handoff', {
        body: {},
      });

      if (!active) return;
      if (error || !data?.field_url) {
        console.error('Field account handoff failed', error ?? data);
        setFailed(true);
        setMessage(data?.error || 'Relay could not connect this account to Field.');
        return;
      }

      window.location.replace(data.field_url);
    })();

    return () => { active = false; };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-ink">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface">
          {failed ? <Network size={18} /> : <Loader2 size={18} className="animate-spin" />}
        </span>
        <h1 className="mt-4 font-display text-2xl font-medium tracking-tight">Field</h1>
        <p className="mt-2 text-sm text-ink-muted">{message}</p>
        {failed && (
          <div className="mt-5 flex justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-canvas">Retry</button>
            <a href={FIELD_URL} className="rounded-md border border-border px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface">Back to Field</a>
          </div>
        )}
      </div>
    </main>
  );
}
