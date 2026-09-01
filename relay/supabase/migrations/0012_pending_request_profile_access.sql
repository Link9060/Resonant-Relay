-- A pending connection request must be able to show the other person's basic
-- profile to its sender and recipient. Keep the lookup private so the policy
-- does not expose profiles to unrelated signed-in users.
create or replace function private.can_view_request_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.connection_requests cr
      where cr.status = 'pending'
        and (
          (cr.sender_id = (select auth.uid()) and cr.recipient_id = target_profile_id)
          or
          (cr.recipient_id = (select auth.uid()) and cr.sender_id = target_profile_id)
        )
    );
$$;

revoke all on function private.can_view_request_profile(uuid) from public, anon;
grant execute on function private.can_view_request_profile(uuid) to authenticated;

drop policy if exists "profiles_select_pending_request_participant" on public.profiles;
create policy "profiles_select_pending_request_participant"
  on public.profiles
  for select
  to authenticated
  using ((select private.can_view_request_profile(id)));

