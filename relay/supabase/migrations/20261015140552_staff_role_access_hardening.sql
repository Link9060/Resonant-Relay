-- Resolve authorization from the live, non-suspended profile on every request.
-- Owner experience previews are client-only and never change this role.
create or replace function public.current_app_role()
returns public.app_role
language sql stable security definer
set search_path = public, pg_temp
as $$
  select coalesce((select p.role from public.profiles p
    where p.id = (select auth.uid()) and p.banned_at is null), 'user'::public.app_role)
$$;

create or replace function public.has_staff_role(p_minimum public.app_role default 'moderator')
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select (select auth.uid()) is not null
    and public.role_rank(public.current_app_role()) >= public.role_rank(p_minimum)
$$;
revoke all on function public.current_app_role() from public, anon;
revoke all on function public.has_staff_role(public.app_role) from public, anon;
grant execute on function public.current_app_role() to authenticated, service_role;
grant execute on function public.has_staff_role(public.app_role) to authenticated, service_role;
