import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/config';

let client: ReturnType<typeof createSupabaseClient<Database>> | undefined;

// enterarrow.com is the authentication authority for every ARROW center.
// The gateway uses the standard Supabase browser storage key, so Relay must
// use that exact same localStorage-backed session when it is mounted at
// enterarrow.com/relay/. Using @supabase/ssr's cookie-backed browser client
// here creates two independent sessions and causes the gateway <-> Relay
// sign-in redirect loop.
export const ARROW_AUTH_STORAGE_KEY = 'sb-cnorozrjugxpanpfmssa-auth-token';

export function createClient() {
  client ??= createSupabaseClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
        storageKey: ARROW_AUTH_STORAGE_KEY,
      },
    },
  );

  return client;
}
