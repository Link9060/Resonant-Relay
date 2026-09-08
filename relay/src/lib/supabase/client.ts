import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/config';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Client-side Supabase instance. Uses the public publishable key only — RLS
 * policies are what actually enforce authorization.
 *
 * Relay handles PKCE callbacks explicitly in /auth/callback. Disabling
 * automatic URL detection prevents the browser client and the callback page
 * from racing to exchange the same single-use auth code.
 */
export function createClient() {
  client ??= createBrowserClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        detectSessionInUrl: false,
      },
    },
  );
  return client;
}
