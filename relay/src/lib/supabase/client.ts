import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/types/database';

/**
 * Client-side Supabase instance. Uses the public anon key only — RLS policies
 * (see supabase/schema.sql) are what actually enforce authorization, never
 * this client's presence or absence.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
