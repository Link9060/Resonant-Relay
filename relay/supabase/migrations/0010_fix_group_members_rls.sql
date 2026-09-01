-- Avoid recursive RLS evaluation when a user reads their group memberships.
-- The helper is in a non-exposed schema and returns only a membership boolean.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_group_member(uuid) from public, anon;
grant execute on function private.is_group_member(uuid) to authenticated;

drop policy if exists "group_members_select_fellow_member" on public.group_members;
create policy "group_members_select_fellow_member"
  on public.group_members
  for select
  to authenticated
  using (private.is_group_member(group_id));

drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member"
  on public.groups
  for select
  to authenticated
  using (private.is_group_member(id));
