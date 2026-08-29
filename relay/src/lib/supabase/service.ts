import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';
import 'server-only';

/**
 * Bypasses RLS entirely — this is what lets us read/write
 * `google_integrations`, a table with RLS enabled and zero policies (see
 * supabase/migrations/0004_student_hub.sql). The `server-only` import above
 * makes Next.js throw a build error if this module is ever pulled into a
 * Client Component, which is the actual enforcement mechanism here — not
 * just a comment.
 *
 * Only ever call this from src/lib/google/* or other server-only modules.
 */
export function createServiceRoleClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
