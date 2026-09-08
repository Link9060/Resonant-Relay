-- RELAY — CONTACT DISCOVERY + MUTUAL CONTEXT
-- Adds privacy-aware name search and people-you-may-know suggestions without
-- opening direct profile-table access. Discovery is exposed only through
-- bounded, authenticated SECURITY DEFINER RPCs.

alter table public.profiles
  add column if not exists discoverable_in_contacts boolean not null default true,
  add column if not exists show_school_in_discovery boolean not null default false;

grant update (discoverable_in_contacts, show_school_in_discovery) on public.profiles to authenticated;

create table if not exists public.contact_discovery_attempts (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists contact_discovery_attempts_requester_time_idx
  on public.contact_discovery_attempts (requester_id, created_at desc);

alter table public.contact_discovery_attempts enable row level security;

create policy "contact_discovery_attempts_no_client_access"
  on public.contact_discovery_attempts for all
  to authenticated
  using (false)
  with check (false);

-- Search by display name. The caller never receives Relay Numbers, bios, email,
-- or another user's contact list. School is returned only when the target has
-- explicitly enabled it for discovery.
create or replace function public.search_contact_discovery(
  p_query text,
  p_limit integer default 12
)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  school text,
  mutual_count integer,
  shared_group_count integer,
  request_state text
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
  clean_query text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := least(greatest(coalesce(p_limit, 12), 1), 20);
  recent_attempts integer;
begin
  if caller is null then raise exception 'not authenticated'; end if;
  if char_length(clean_query) < 2 then raise exception 'enter at least 2 characters'; end if;
  if char_length(clean_query) > 40 then clean_query := left(clean_query, 40); end if;

  select count(*) into recent_attempts
  from public.contact_discovery_attempts a
  where a.requester_id = caller
    and a.created_at > now() - interval '10 minutes';

  if recent_attempts >= 60 then
    raise exception 'too many searches — please wait a few minutes and try again';
  end if;

  insert into public.contact_discovery_attempts (requester_id) values (caller);

  return query
  with my_contacts as (
    select case when c.user_a = caller then c.user_b else c.user_a end as contact_id
    from public.connections c
    where c.user_a = caller or c.user_b = caller
  ),
  my_groups as (
    select gm.group_id
    from public.group_members gm
    where gm.user_id = caller
  ),
  candidates as (
    select
      p.id,
      p.display_name,
      p.avatar_url,
      case when p.show_school_in_discovery then p.school else null end as school,
      (
        select count(*)::integer
        from my_contacts mine
        where exists (
          select 1 from public.connections their_connection
          where (their_connection.user_a = p.id and their_connection.user_b = mine.contact_id)
             or (their_connection.user_b = p.id and their_connection.user_a = mine.contact_id)
        )
      ) as mutual_count,
      (
        select count(*)::integer
        from my_groups mine_group
        join public.group_members their_group
          on their_group.group_id = mine_group.group_id
         and their_group.user_id = p.id
      ) as shared_group_count,
      case
        when exists (
          select 1 from public.connection_requests r
          where r.sender_id = caller and r.recipient_id = p.id and r.status = 'pending'
        ) then 'outgoing'
        when exists (
          select 1 from public.connection_requests r
          where r.sender_id = p.id and r.recipient_id = caller and r.status = 'pending'
        ) then 'incoming'
        else 'none'
      end as request_state
    from public.profiles p
    where p.id <> caller
      and p.discoverable_in_contacts = true
      and position(clean_query in lower(p.display_name)) > 0
      and not public.are_connected(caller, p.id)
      and not private.is_blocked_between(caller, p.id)
  )
  select
    c.id,
    c.display_name,
    c.avatar_url,
    c.school,
    c.mutual_count,
    c.shared_group_count,
    c.request_state
  from candidates c
  order by
    case when lower(c.display_name) = clean_query then 0
         when left(lower(c.display_name), char_length(clean_query)) = clean_query then 1
         else 2 end,
    c.mutual_count desc,
    c.shared_group_count desc,
    lower(c.display_name)
  limit safe_limit;
end;
$$;

-- Suggestions are intentionally context-based: a candidate must share at least
-- one accepted mutual contact or one group with the caller. This avoids a
-- global "random users" directory.
create or replace function public.contact_discovery_suggestions(
  p_limit integer default 12
)
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  school text,
  mutual_count integer,
  shared_group_count integer,
  request_state text
)
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
  safe_limit integer := least(greatest(coalesce(p_limit, 12), 1), 20);
begin
  if caller is null then raise exception 'not authenticated'; end if;

  return query
  with my_contacts as (
    select case when c.user_a = caller then c.user_b else c.user_a end as contact_id
    from public.connections c
    where c.user_a = caller or c.user_b = caller
  ),
  my_groups as (
    select gm.group_id
    from public.group_members gm
    where gm.user_id = caller
  ),
  candidates as (
    select
      p.id,
      p.display_name,
      p.avatar_url,
      case when p.show_school_in_discovery then p.school else null end as school,
      (
        select count(*)::integer
        from my_contacts mine
        where exists (
          select 1 from public.connections their_connection
          where (their_connection.user_a = p.id and their_connection.user_b = mine.contact_id)
             or (their_connection.user_b = p.id and their_connection.user_a = mine.contact_id)
        )
      ) as mutual_count,
      (
        select count(*)::integer
        from my_groups mine_group
        join public.group_members their_group
          on their_group.group_id = mine_group.group_id
         and their_group.user_id = p.id
      ) as shared_group_count,
      case
        when exists (
          select 1 from public.connection_requests r
          where r.sender_id = caller and r.recipient_id = p.id and r.status = 'pending'
        ) then 'outgoing'
        when exists (
          select 1 from public.connection_requests r
          where r.sender_id = p.id and r.recipient_id = caller and r.status = 'pending'
        ) then 'incoming'
        else 'none'
      end as request_state
    from public.profiles p
    where p.id <> caller
      and p.discoverable_in_contacts = true
      and not public.are_connected(caller, p.id)
      and not private.is_blocked_between(caller, p.id)
  )
  select
    c.id,
    c.display_name,
    c.avatar_url,
    c.school,
    c.mutual_count,
    c.shared_group_count,
    c.request_state
  from candidates c
  where c.mutual_count > 0 or c.shared_group_count > 0
  order by
    c.mutual_count desc,
    c.shared_group_count desc,
    lower(c.display_name)
  limit safe_limit;
end;
$$;

revoke all on function public.search_contact_discovery(text, integer) from public, anon;
revoke all on function public.contact_discovery_suggestions(integer) from public, anon;
grant execute on function public.search_contact_discovery(text, integer) to authenticated;
grant execute on function public.contact_discovery_suggestions(integer) to authenticated;
