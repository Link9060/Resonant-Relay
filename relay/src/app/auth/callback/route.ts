import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Google redirects here after the user authenticates. We exchange the
// one-time `code` for a session (server-side, so tokens never touch the
// browser as raw values) and then send them on into the app. The
// on_auth_user_created trigger (see supabase/schema.sql) creates their
// profile + Relay Number automatically on first sign-in.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
