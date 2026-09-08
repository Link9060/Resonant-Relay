-- Final public-release policy cleanup: remove dead direct-write policies,
-- narrow read policies to authenticated users, avoid per-row auth.uid() work,
-- and cover the final two foreign-key indexes reported by the advisor.

create index if not exists plans_created_by_idx on public.plans(created_by);
create index if not exists profiles_banned_by_idx on public.profiles(banned_by) where banned_by is not null;

-- Direct mutations are intentionally RPC-only after 0032, so these policies
-- can no longer be reached by authenticated clients and only add confusion.
drop policy if exists requests_insert_as_sender on public.connection_requests;
drop policy if exists requests_update_participant on public.connection_requests;
drop policy if exists requests_select_participant on public.connection_requests;
create policy requests_select_participant
on public.connection_requests for select
to authenticated
using (
  (select auth.uid()) = sender_id
  or (select auth.uid()) = recipient_id
);

-- Profiles are visible only to the signed-in owner, accepted contacts, or a
-- participant in a pending request. Keep the same product behavior in one
-- authenticated policy and evaluate auth.uid() once per statement.
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_connections on public.profiles;
drop policy if exists profiles_select_pending_request_participant on public.profiles;
create policy profiles_select_allowed
on public.profiles for select
to authenticated
using (
  (select auth.uid()) = id
  or exists (
    select 1
    from public.connections c
    where (c.user_a = (select auth.uid()) and c.user_b = profiles.id)
       or (c.user_b = (select auth.uid()) and c.user_a = profiles.id)
  )
  or private.can_view_request_profile(profiles.id)
);

-- A requester can read their own support items; staff can additionally read
-- items allowed by their role. Combining these avoids duplicate permissive
-- SELECT policies without changing the visibility rules.
drop policy if exists staff_requests_own_read on public.staff_requests;
drop policy if exists staff_requests_staff_read on public.staff_requests;
create policy staff_requests_read_allowed
on public.staff_requests for select
to authenticated
using (
  requester_id = (select auth.uid())
  or (
    public.has_staff_role('moderator')
    and public.staff_can_view_request_type(public.current_app_role(), request_type)
  )
);
