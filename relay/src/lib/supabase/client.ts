import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/config';

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Client-side Supabase instance. Uses the public anon key only — RLS policies
 * (see supabase/schema.sql) are what actually enforce authorization, never
 * this client's presence or absence.
 */
export function createClient() {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return client;
}
