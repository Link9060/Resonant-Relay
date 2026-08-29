-- ============================================================================
-- RELAY — STUDENT HUB PHASE SCHEMA
-- Storage for incrementally-granted Google Calendar / Gmail OAuth tokens.
-- Run after 0001-0003, once.
--
-- SECURITY NOTE: this table holds refresh tokens for third-party APIs.
-- Per Supabase's own guidance, provider OAuth tokens are never persisted by
-- Supabase Auth itself — an app that wants them has to capture and store
-- them explicitly. This table has RLS enabled with NO policies defined for
-- any role, which means Postgres denies every operation to the `anon` and
-- `authenticated` roles by default — there is no row a browser session can
-- ever read or write here, even the user's own. Only the `service_role` key
-- (which bypasses RLS) can touch it, and that key is only ever used from
-- server-only modules (src/lib/google/*), never from client components or
-- anything shipped to the browser.
-- ============================================================================

create table public.google_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  service text not null check (service in ('calendar', 'gmail')),
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  granted_scope text not null,
  connected_at timestamptz not null default now(),
  unique (user_id, service)
);

alter table public.google_integrations enable row level security;
-- Intentionally no policies. See note above.
