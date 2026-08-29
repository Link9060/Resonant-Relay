-- ============================================================================
-- RELAY — FOUNDATION PHASE SCHEMA
-- Auth, profiles, Relay Numbers, contacts / connection requests.
-- Run in the Supabase SQL editor (or via `supabase db push`) on a fresh project.
-- Assumes Supabase Auth is enabled with the Google provider configured in the
-- dashboard (Authentication -> Providers -> Google). This file does not touch
-- auth.users; it only adds the app-level tables that hang off it.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- PROFILES
-- One row per Relay account, 1:1 with auth.users.
-- ----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  relay_number text not null unique,
  school text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Relay Numbers are shown as "123-4567" but stored digits-only for indexing.
alter table public.profiles
  add constraint relay_number_format check (relay_number ~ '^[0-9]{7}$');

create index profiles_relay_number_idx on public.profiles (relay_number);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RELAY NUMBER GENERATION
-- Random, not sequential, so numbers can't be guessed by incrementing.
-- Retries on collision (7 digits ~ 10M space, collisions will be rare).
-- ----------------------------------------------------------------------------
create or replace function public.generate_relay_number()
returns text
language plpgsql
as $$
declare
  candidate text;
  exists_already boolean;
begin
  loop
    candidate := lpad(floor(random() * 10000000)::text, 7, '0');
    select exists(select 1 from public.profiles where relay_number = candidate)
      into exists_already;
    exit when not exists_already;
  end loop;
  return candidate;
end;
$$;

-- Creates the Relay profile the first time a user signs in.
-- Wired up via a Supabase Auth trigger on auth.users insert (see below),
-- so every authenticated user gets exactly one profile + Relay Number.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, relay_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url',
    public.generate_relay_number()
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- CONNECTIONS  (accepted, mutual — the Relay "contacts" graph)
-- Stored with a canonical ordering (user_a < user_b) so each pair has exactly
-- one row and we never have to check both directions.
-- ----------------------------------------------------------------------------
create table public.connections (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint connections_ordered check (user_a < user_b),
  constraint connections_unique unique (user_a, user_b)
);

create index connections_user_a_idx on public.connections (user_a);
create index connections_user_b_idx on public.connections (user_b);

-- ----------------------------------------------------------------------------
-- CONNECTION REQUESTS
-- Pending/accepted/declined/canceled. Accepting a request creates a row in
-- `connections` and marks the request accepted (see accept_connection_request).
-- ----------------------------------------------------------------------------
create type public.connection_request_status as enum ('pending', 'accepted', 'declined', 'canceled');

create table public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status public.connection_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_request check (sender_id <> recipient_id)
);

-- Only one *pending* request per direction at a time.
create unique index connection_requests_pending_unique
  on public.connection_requests (sender_id, recipient_id)
  where status = 'pending';

create index connection_requests_recipient_idx on public.connection_requests (recipient_id, status);
create index connection_requests_sender_idx on public.connection_requests (sender_id, status);

-- ----------------------------------------------------------------------------
-- RELAY NUMBER LOOKUP ATTEMPTS  (anti-enumeration / anti-scraping)
-- Every lookup, hit or miss, is logged so we can rate-limit per requester.
-- ----------------------------------------------------------------------------
create table public.relay_number_lookup_attempts (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  queried_number text not null,
  created_at timestamptz not null default now()
);

create index lookup_attempts_requester_time_idx
  on public.relay_number_lookup_attempts (requester_id, created_at desc);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.connections enable row level security;
alter table public.connection_requests enable row level security;
alter table public.relay_number_lookup_attempts enable row level security;

-- Profiles: a user can always read/update their own full row.
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

-- Profiles: a user can read the (full) profile row of anyone they're
-- actually connected to. Direct relay_number lookups do NOT go through this
-- policy — they go through the rate-limited RPC below instead.
create policy "profiles_select_connections"
  on public.profiles for select
  using (
    exists (
      select 1 from public.connections c
      where (c.user_a = auth.uid() and c.user_b = profiles.id)
         or (c.user_b = auth.uid() and c.user_a = profiles.id)
    )
  );

-- Connections: visible to either side of the pair only.
create policy "connections_select_participant"
  on public.connections for select
  using (auth.uid() = user_a or auth.uid() = user_b);

-- Connections are never inserted directly by clients — only via
-- accept_connection_request() (security definer, below).
create policy "connections_no_direct_insert"
  on public.connections for insert
  with check (false);

-- Connection requests: sender and recipient can both see a request.
create policy "requests_select_participant"
  on public.connection_requests for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- A user may only create a request as themselves.
create policy "requests_insert_as_sender"
  on public.connection_requests for insert
  with check (auth.uid() = sender_id);

-- A user may only update (accept/decline/cancel) requests they're party to.
create policy "requests_update_participant"
  on public.connection_requests for update
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Lookup attempts are internal bookkeeping — no direct client access at all;
-- only the security-definer RPC below reads/writes this table.
create policy "lookup_attempts_no_client_access"
  on public.relay_number_lookup_attempts for all
  using (false)
  with check (false);

-- ----------------------------------------------------------------------------
-- RPC: find_by_relay_number
-- The ONLY way a client looks someone up by Relay Number. Runs as the
-- function owner (security definer) so it can bypass the profiles RLS
-- policy above just enough to return a minimal, safe preview — never the
-- full row, and never a fuzzy/partial match.
--
-- Anti-scraping measures:
--   * exact match only, no ILIKE / partial search
--   * every attempt (hit or miss) is logged
--   * hard rate limit: 20 lookups per rolling 10 minutes per user
-- ----------------------------------------------------------------------------
create or replace function public.find_by_relay_number(p_relay_number text)
returns table (id uuid, display_name text, avatar_url text, school text)
language plpgsql
security definer set search_path = public
as $$
declare
  recent_attempts int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select count(*) into recent_attempts
  from public.relay_number_lookup_attempts
  where requester_id = auth.uid()
    and created_at > now() - interval '10 minutes';

  if recent_attempts >= 20 then
    raise exception 'too many lookups — please wait a few minutes and try again';
  end if;

  insert into public.relay_number_lookup_attempts (requester_id, queried_number)
  values (auth.uid(), p_relay_number);

  return query
    select p.id, p.display_name, p.avatar_url, p.school
    from public.profiles p
    where p.relay_number = p_relay_number
      and p.id <> auth.uid();
end;
$$;

revoke all on function public.find_by_relay_number(text) from public;
grant execute on function public.find_by_relay_number(text) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: accept_connection_request
-- Atomically marks a request accepted and creates the (canonically ordered)
-- connections row. Only the recipient of the request may call this.
-- ----------------------------------------------------------------------------
create or replace function public.accept_connection_request(p_request_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  req record;
  a uuid;
  b uuid;
begin
  select * into req from public.connection_requests where id = p_request_id for update;

  if req is null then
    raise exception 'request not found';
  end if;

  if req.recipient_id <> auth.uid() then
    raise exception 'only the recipient can accept this request';
  end if;

  if req.status <> 'pending' then
    raise exception 'request is no longer pending';
  end if;

  update public.connection_requests
    set status = 'accepted', responded_at = now()
    where id = p_request_id;

  if req.sender_id < req.recipient_id then
    a := req.sender_id; b := req.recipient_id;
  else
    a := req.recipient_id; b := req.sender_id;
  end if;

  insert into public.connections (user_a, user_b)
  values (a, b)
  on conflict (user_a, user_b) do nothing;
end;
$$;

revoke all on function public.accept_connection_request(uuid) from public;
grant execute on function public.accept_connection_request(uuid) to authenticated;
