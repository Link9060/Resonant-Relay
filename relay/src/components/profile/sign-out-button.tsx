'use client';

import { appPageUrl } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign(appPageUrl('/login'));
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-md border border-border py-2.5 text-sm font-medium text-ink-muted hover:bg-surface"
    >
      Sign out
    </button>
  );
}
