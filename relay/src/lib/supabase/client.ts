import { createClient as createSupabaseClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/database';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/config';

let client: SupabaseClient<Database> | undefined;

// enterarrow.com is the authentication authority for every ARROW center.
// The gateway and Relay intentionally share this exact Supabase storage key.
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

function readStoredArrowSession(): Pick<Session, 'access_token' | 'refresh_token'> | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(ARROW_AUTH_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : null;
    const accessToken = stored?.access_token;
    const refreshToken = stored?.refresh_token;

    if (typeof accessToken !== 'string' || !accessToken) return null;
    if (typeof refreshToken !== 'string' || !refreshToken) return null;

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  } catch {
    return null;
  }
}

/**
 * Explicitly bridge the universal ARROW session into Relay before Relay decides
 * the visitor is signed out. Normally supabase-js hydrates this automatically,
 * but this fallback prevents a hydration race from causing an auth redirect loop.
 */
export async function ensureArrowBrowserSession() {
  const supabase = createClient();

  const existing = await supabase.auth.getSession();
  if (existing.data.session) return existing.data.session;

  const stored = readStoredArrowSession();
  if (!stored) return null;

  const { data, error } = await supabase.auth.setSession(stored);
  if (error) {
    console.warn('Relay could not adopt the existing ARROW session.', error);
    return null;
  }

  return data.session ?? null;
}
