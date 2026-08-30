-- Keep Google OAuth authorization codes and refresh tokens on trusted
-- Supabase infrastructure. Browser roles cannot access these state records.
create table public.google_oauth_states (
  state_hash text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  service text not null check (service in ('calendar', 'gmail')),
  return_to text not null check (return_to in ('/calendar', '/email')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index google_oauth_states_expires_idx
  on public.google_oauth_states (expires_at);

alter table public.google_oauth_states enable row level security;
revoke all on public.google_oauth_states from public, anon, authenticated;
grant select, insert, delete on public.google_oauth_states to service_role;

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- These SECURITY DEFINER functions are trigger-only implementation details.
-- The triggers keep working, while the Data API cannot call them as RPCs.
revoke execute on function public.notify_connection_request() from public, anon, authenticated;
revoke execute on function public.notify_connection_accepted() from public, anon, authenticated;
revoke execute on function public.notify_group_member_added() from public, anon, authenticated;
revoke execute on function public.notify_new_message() from public, anon, authenticated;
revoke execute on function public.notify_plan_created() from public, anon, authenticated;
