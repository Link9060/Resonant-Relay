-- RELAY — STAFF HIERARCHY + OWNER ANALYTICS
-- user < moderator < admin < owner

create type public.app_role as enum ('user', 'moderator', 'admin', 'owner');

alter table public.profiles
  add column role public.app_role not null default 'user';

create index profiles_role_idx on public.profiles (role);

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.role from public.profiles p where p.id = auth.uid()), 'user'::public.app_role);
$$;

create or replace function public.role_rank(p_role public.app_role)
returns integer
language sql
immutable
as $$
  select case p_role
    when 'user' then 0
    when 'moderator' then 1
    when 'admin' then 2
    when 'owner' then 3
  end;
$$;

create or replace function public.has_staff_role(p_minimum public.app_role default 'moderator')
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and public.role_rank(public.current_app_role()) >= public.role_rank(p_minimum);
$$;

-- Users may update their own profile, but never self-promote.
-- This trigger protects role changes even when an existing broad profile UPDATE
-- policy is used by the client.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.has_staff_role('owner') then
    raise exception 'only an owner can change account roles';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log(created_at desc);
create index admin_audit_log_actor_idx on public.admin_audit_log(actor_id, created_at desc);
alter table public.admin_audit_log enable row level security;

create policy "audit_owner_read"
  on public.admin_audit_log for select
  using (public.has_staff_role('owner'));

create policy "audit_no_client_write"
  on public.admin_audit_log for all
  using (false)
  with check (false);

-- Owner-only role assignment. Owners cannot demote themselves, preventing
-- accidental lockout of the only full-control account.
create or replace function public.set_user_role(p_user_id uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_role public.app_role;
begin
  if not public.has_staff_role('owner') then
    raise exception 'owner permission required';
  end if;

  if p_user_id = auth.uid() and p_role <> 'owner' then
    raise exception 'owners cannot demote their own account';
  end if;

  select role into v_old_role from public.profiles where id = p_user_id;
  if v_old_role is null then
    raise exception 'user not found';
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  insert into public.admin_audit_log(actor_id, action, target_user_id, metadata)
  values (auth.uid(), 'set_user_role', p_user_id,
    jsonb_build_object('old_role', v_old_role, 'new_role', p_role));
end;
$$;

-- Admin/owner account browser. Does not expose OAuth tokens or private message
-- contents. Moderators intentionally do not get the full account directory.
create or replace function public.admin_list_users(p_limit integer default 100, p_offset integer default 0)
returns table (
  id uuid,
  display_name text,
  relay_number text,
  school text,
  role public.app_role,
  created_at timestamptz,
  primary_email text,
  last_sign_in_at timestamptz,
  gmail_connected boolean,
  message_count bigint,
  connection_count bigint
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    p.display_name,
    p.relay_number,
    p.school,
    p.role,
    p.created_at,
    u.email::text,
    u.last_sign_in_at,
    exists(select 1 from public.google_integrations gi where gi.user_id = p.id and gi.service = 'gmail'),
    (select count(*) from public.messages m where m.sender_id = p.id),
    (select count(*) from public.connections c where c.user_a = p.id or c.user_b = p.id)
  from public.profiles p
  left join auth.users u on u.id = p.id
  where public.has_staff_role('admin')
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 250))
  offset greatest(coalesce(p_offset, 0), 0);
$$;

-- Owner-only operational dashboard. Counts are deliberately aggregate only;
-- this does not grant an owner blanket access to private message bodies.
create or replace function public.owner_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, storage
as $$
declare
  v_result jsonb;
begin
  if not public.has_staff_role('owner') then
    raise exception 'owner permission required';
  end if;

  select jsonb_build_object(
    'users', jsonb_build_object(
      'total', (select count(*) from public.profiles),
      'auth_accounts', (select count(*) from auth.users),
      'primary_email_accounts', (select count(*) from auth.users where email is not null),
      'gmail_integrations', (select count(*) from public.google_integrations where service = 'gmail'),
      'calendar_integrations', (select count(*) from public.google_integrations where service = 'calendar'),
      'active_24h', (select count(*) from auth.users where last_sign_in_at >= now() - interval '24 hours'),
      'active_7d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '7 days'),
      'active_30d', (select count(*) from auth.users where last_sign_in_at >= now() - interval '30 days'),
      'new_24h', (select count(*) from public.profiles where created_at >= now() - interval '24 hours'),
      'new_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
      'new_30d', (select count(*) from public.profiles where created_at >= now() - interval '30 days'),
      'moderators', (select count(*) from public.profiles where role = 'moderator'),
      'admins', (select count(*) from public.profiles where role = 'admin'),
      'owners', (select count(*) from public.profiles where role = 'owner')
    ),
    'messaging', jsonb_build_object(
      'messages_total', (select count(*) from public.messages),
      'messages_24h', (select count(*) from public.messages where created_at >= now() - interval '24 hours'),
      'messages_7d', (select count(*) from public.messages where created_at >= now() - interval '7 days'),
      'conversations_total', (select count(*) from public.conversations),
      'direct_conversations', (select count(*) from public.conversations where type = 'direct'),
      'group_conversations', (select count(*) from public.conversations where type = 'group'),
      'groups_total', (select count(*) from public.groups),
      'connections_total', (select count(*) from public.connections),
      'pending_connection_requests', (select count(*) from public.connection_requests where status = 'pending')
    ),
    'engagement', jsonb_build_object(
      'notifications_total', (select count(*) from public.notifications),
      'notifications_unread', (select count(*) from public.notifications where read_at is null),
      'push_enabled_devices', (select count(*) from public.push_subscriptions),
      'users_with_push', (select count(distinct user_id) from public.push_subscriptions),
      'relay_number_lookups_24h', (select count(*) from public.relay_number_lookup_attempts where created_at >= now() - interval '24 hours')
    ),
    'storage', jsonb_build_object(
      'objects_total', (select count(*) from storage.objects),
      'bytes_total', coalesce((select sum(case when coalesce(metadata->>'size','') ~ '^[0-9]+$' then (metadata->>'size')::bigint else 0 end) from storage.objects), 0),
      'buckets_used', (select count(distinct bucket_id) from storage.objects)
    ),
    'generated_at', now()
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.has_staff_role(public.app_role) to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_list_users(integer, integer) to authenticated;
grant execute on function public.owner_dashboard_stats() to authenticated;

-- ONE-TIME OWNER BOOTSTRAP (run manually in the Supabase SQL editor after this
-- migration, replacing the email):
-- update public.profiles
-- set role = 'owner'
-- where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');
