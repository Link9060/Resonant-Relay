'use client';

import { createClient } from '@/lib/supabase/client';
import type { GoogleService } from '@/lib/google/scopes';
import { useState } from 'react';

const LABEL: Record<GoogleService, string> = {
  calendar: 'Connect Google Calendar',
  gmail: 'Connect Gmail',
};

export function ConnectGoogleButton({ service, next }: { service: GoogleService; next: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: invokeError } = await supabase.functions.invoke('google-hub', {
      body: { action: 'connect_start', service, returnTo: next },
    });

    if (invokeError || !data?.url) {
      setError(data?.error ?? 'Google connection is not configured yet.');
      setLoading(false);
      return;
    }
    window.location.assign(data.url);
  }

  return (
    <div className="text-right">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-canvas transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
      >
        {loading ? 'Connecting…' : LABEL[service]}
      </button>
      {error && <p className="mt-2 max-w-xs text-xs text-red-500">{error}</p>}
    </div>
  );
}
