import { createClient } from '@/lib/supabase/server';
import { saveGoogleIntegration } from '@/lib/google/tokens';
import { GOOGLE_SCOPES, type GoogleService } from '@/lib/google/scopes';
import { NextResponse } from 'next/server';

// Google redirects here both for the initial "Continue with Google" sign-in
// and for later incremental-scope "Connect Calendar/Gmail" flows — the
// `connect` param tells us which case we're in. We exchange the one-time
// `code` for a session (server-side, so tokens never touch the browser as
// raw values); the on_auth_user_created trigger (see
// supabase/migrations/0001_foundation.sql) creates the profile + Relay
// Number automatically on first sign-in.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';
  const connect = searchParams.get('connect') as GoogleService | null;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  // A "Connect Calendar" / "Connect Gmail" flow re-runs Google OAuth with an
  // additional scope for the already-signed-in user. Supabase doesn't
  // persist provider tokens itself (by design — see its social-login docs),
  // so we capture them here, once, and store them ourselves.
  if (connect && data.session?.provider_refresh_token && data.session.provider_token) {
    try {
      await saveGoogleIntegration({
        userId: data.session.user.id,
        service: connect,
        refreshToken: data.session.provider_refresh_token,
        accessToken: data.session.provider_token,
        // Google's OAuth session token doesn't surface its own expires_in
        // here; a conservative under-estimate just means an extra refresh
        // call sooner than strictly necessary, never a stale-token failure.
        expiresInSeconds: 55 * 60,
        grantedScope: GOOGLE_SCOPES[connect],
      });
    } catch {
      return NextResponse.redirect(`${origin}${next}?error=connect_failed`);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
