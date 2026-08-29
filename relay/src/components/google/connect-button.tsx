'use client';

import { createClient } from '@/lib/supabase/client';
import { GOOGLE_SCOPES, type GoogleService } from '@/lib/google/scopes';

const LABEL: Record<GoogleService, string> = {
  calendar: 'Connect Google Calendar',
  gmail: 'Connect Gmail',
};

export function ConnectGoogleButton({ service, next }: { service: GoogleService; next: string }) {
  async function handleConnect() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?connect=${service}&next=${encodeURIComponent(next)}`,
        scopes: `openid email profile ${GOOGLE_SCOPES[service]}`,
        // Both are required to get a refresh token back from Google — see
        // supabase/migrations/0004_student_hub.sql for why we need one.
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  }

  return (
    <button
      onClick={handleConnect}
      className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-canvas transition-all hover:opacity-90 active:scale-[0.97]"
    >
      {LABEL[service]}
    </button>
  );
}
