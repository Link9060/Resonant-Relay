-- ============================================================================
-- RELAY — PLANNER (RELAY DIFFERENTIATOR) PHASE SCHEMA
-- Recurring plans, per-occurrence instances, and responses. Builds on
-- 0001_foundation.sql and 0002_social_core.sql. Run after those, once.
--
-- Design note: a Plan always belongs to a Group (see 0002). The spec's
-- Seminar example is exactly "select your existing friend group instead of
-- picking six people every week" — groups already solve participant
-- selection, so Planner reuses them rather than inventing a second concept.
-- ============================================================================

create type public.plan_response_type as enum ('rsvp', 'select_option');
create type public.plan_repeat_rule as enum ('never', 'daily', 'weekly', 'custom');
create type public.rsvp_status as enum ('yes', 'no', 'maybe');

-- ----------------------------------------------------------------------------
-- PLANS
-- The repeating structure ("Seminar, every Friday"). Not itself a place to
-- respond to — that's what plan_instances are for.
-- ----------------------------------------------------------------------------
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  notes text check (notes is null or char_length(notes) <= 500),
  response_type public.plan_response_type not null,
  repeat_rule public.plan_repeat_rule not null,
  starts_on date not null,
  repeat_until date,
  created_at timestamptz not null default now()
);

create index plans_group_idx on public.plans (group_id);

-- Only used when response_type = 'select_option' (e.g. teacher/location for
-- Seminar, restaurant for a lunch vote). Fixed at creation for the MVP.
create table public.plan_options (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  sort_order int not null default 0
);

create index plan_options_plan_idx on public.plan_options (plan_id);

-- ----------------------------------------------------------------------------
-- PLAN INSTANCES
-- Each occurrence is its own row with its own responses — a recurring Plan
-- must never collapse to a single shared answer (see product spec §12).
-- ----------------------------------------------------------------------------
create table public.plan_instances (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  occurs_on date not null,
  created_at timestamptz not null default now(),
  unique (plan_id, occurs_on)
);

create index plan_instances_plan_idx on public.plan_instances (plan_id, occurs_on);

-- ----------------------------------------------------------------------------
-- PLAN RESPONSES
-- One response per person per occurrence. Exactly one of option_id /
-- rsvp_status is set, matching the parent plan's response_type.
-- ----------------------------------------------------------------------------
create table public.plan_responses (
  id uuid primary key default gen_random_uuid(),
  plan_instance_id uuid not null references public.plan_instances (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_id uuid references public.plan_options (id) on delete cascade,
  rsvp_status public.rsvp_status,
  responded_at timestamptz not null default now(),
  unique (plan_instance_id, user_id),
  constraint exactly_one_response_shape check (
    (option_id is not null and rsvp_status is null) or
    (option_id is null and rsvp_status is not null)
  )
);

create index plan_responses_instance_idx on public.plan_responses (plan_instance_id);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- Everything here is scoped to "member of the plan's group." Writes go
-- through the RPCs below — there's no direct-insert policy for
-- plans/plan_options/plan_instances/plan_responses, so with RLS enabled and
-- no matching policy, Postgres denies those commands by default for the
-- authenticated role. The security-definer functions still work because
-- they run with the function owner's privileges, not the caller's.
-- ----------------------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.plan_options enable row level security;
alter table public.plan_instances enable row level security;
alter table public.plan_responses enable row level security;

create policy "plans_select_group_member"
  on public.plans for select
  using (exists (select 1 from public.group_members gm where gm.group_id = plans.group_id and gm.user_id = auth.uid()));

create policy "plan_options_select_group_member"
  on public.plan_options for select
  using (
    exists (
      select 1 from public.plans p
      join public.group_members gm on gm.group_id = p.group_id
      where p.id = plan_options.plan_id and gm.user_id = auth.uid()
    )
  );

create policy "plan_instances_select_group_member"
  on public.plan_instances for select
  using (
    exists (
      select 1 from public.plans p
      join public.group_members gm on gm.group_id = p.group_id
      where p.id = plan_instances.plan_id and gm.user_id = auth.uid()
    )
  );

-- Responses are visible to the whole group, not just the responder — the
-- entire point is "Relay immediately shows everyone" instead of hiding
-- answers the way a private poll would.
create policy "plan_responses_select_group_member"
  on public.plan_responses for select
  using (
    exists (
      select 1 from public.plan_instances pi
      join public.plans p on p.id = pi.plan_id
      join public.group_members gm on gm.group_id = p.group_id
      where pi.id = plan_responses.plan_instance_id and gm.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- RPC: create_plan
-- Validates membership + shape, inserts the plan (+ options, if any), and
-- generates its instances up front:
--   never   -> a single instance on starts_on
--   custom  -> one instance per date in p_custom_dates
--   daily/weekly -> generated from starts_on, stopping at repeat_until if
--                   given, otherwise capped at 8 so an open-ended plan
--                   doesn't try to generate occurrences forever
-- A hard cap of 26 instances applies regardless, as a sanity bound.
-- ----------------------------------------------------------------------------
create or replace function public.create_plan(
  p_group_id uuid,
  p_name text,
  p_notes text,
  p_response_type text,
  p_options text[],
  p_repeat_rule text,
  p_starts_on date,
  p_repeat_until date,
  p_custom_dates date[]
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_plan_id uuid;
  cursor_date date;
  occurrence_count int := 0;
  max_occurrences constant int := 26;
  open_ended_cap constant int := 8;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = auth.uid()) then
    raise exception 'you must be a member of this group to plan for it';
  end if;
  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'plan name is required';
  end if;
  if p_response_type not in ('rsvp', 'select_option') then
    raise exception 'invalid response type';
  end if;
  if p_response_type = 'select_option' and coalesce(array_length(p_options, 1), 0) < 2 then
    raise exception 'give at least two options to choose between';
  end if;
  if p_repeat_rule not in ('never', 'daily', 'weekly', 'custom') then
    raise exception 'invalid repeat rule';
  end if;
  if p_repeat_rule = 'custom' and coalesce(array_length(p_custom_dates, 1), 0) = 0 then
    raise exception 'pick at least one date for a custom schedule';
  end if;

  insert into public.plans (group_id, created_by, name, notes, response_type, repeat_rule, starts_on, repeat_until)
  values (
    p_group_id, auth.uid(), trim(p_name), nullif(trim(coalesce(p_notes, '')), ''),
    p_response_type::public.plan_response_type, p_repeat_rule::public.plan_repeat_rule,
    p_starts_on, p_repeat_until
  )
  returning id into new_plan_id;

  if p_response_type = 'select_option' then
    for occurrence_count in 1..array_length(p_options, 1) loop
      insert into public.plan_options (plan_id, label, sort_order)
      values (new_plan_id, trim(p_options[occurrence_count]), occurrence_count);
    end loop;
    occurrence_count := 0;
  end if;

  if p_repeat_rule = 'never' then
    insert into public.plan_instances (plan_id, occurs_on) values (new_plan_id, p_starts_on);
  elsif p_repeat_rule = 'custom' then
    insert into public.plan_instances (plan_id, occurs_on)
    select new_plan_id, d from unnest(p_custom_dates) as d
    on conflict (plan_id, occurs_on) do nothing;
  else
    cursor_date := p_starts_on;
    while occurrence_count < max_occurrences
      and (p_repeat_until is null or cursor_date <= p_repeat_until)
      and (p_repeat_until is not null or occurrence_count < open_ended_cap)
    loop
      insert into public.plan_instances (plan_id, occurs_on) values (new_plan_id, cursor_date)
        on conflict (plan_id, occurs_on) do nothing;
      occurrence_count := occurrence_count + 1;
      cursor_date := cursor_date + (case when p_repeat_rule = 'daily' then 1 else 7 end);
    end loop;
  end if;

  return new_plan_id;
end;
$$;

revoke all on function public.create_plan(uuid, text, text, text, text[], text, date, date, date[]) from public;
grant execute on function public.create_plan(uuid, text, text, text, text[], text, date, date, date[]) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: submit_plan_response
-- Upserts the caller's response for one occurrence. Validates that the
-- response shape (option vs. rsvp) matches the plan's response_type and that
-- the caller is actually in the plan's group.
-- ----------------------------------------------------------------------------
create or replace function public.submit_plan_response(
  p_instance_id uuid,
  p_option_id uuid default null,
  p_rsvp_status text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_plan record;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select p.id, p.group_id, p.response_type into target_plan
  from public.plan_instances pi
  join public.plans p on p.id = pi.plan_id
  where pi.id = p_instance_id;

  if target_plan is null then
    raise exception 'plan occurrence not found';
  end if;
  if not exists (select 1 from public.group_members where group_id = target_plan.group_id and user_id = auth.uid()) then
    raise exception 'you are not part of this plan''s group';
  end if;

  if target_plan.response_type = 'select_option' then
    if p_option_id is null then
      raise exception 'pick an option';
    end if;
    if not exists (select 1 from public.plan_options where id = p_option_id and plan_id = target_plan.id) then
      raise exception 'that option does not belong to this plan';
    end if;
    insert into public.plan_responses (plan_instance_id, user_id, option_id, rsvp_status)
    values (p_instance_id, auth.uid(), p_option_id, null)
    on conflict (plan_instance_id, user_id)
      do update set option_id = excluded.option_id, rsvp_status = null, responded_at = now();
  else
    if p_rsvp_status is null or p_rsvp_status not in ('yes', 'no', 'maybe') then
      raise exception 'pick yes, no, or maybe';
    end if;
    insert into public.plan_responses (plan_instance_id, user_id, option_id, rsvp_status)
    values (p_instance_id, auth.uid(), null, p_rsvp_status::public.rsvp_status)
    on conflict (plan_instance_id, user_id)
      do update set rsvp_status = excluded.rsvp_status, option_id = null, responded_at = now();
  end if;
end;
$$;

revoke all on function public.submit_plan_response(uuid, uuid, text) from public;
grant execute on function public.submit_plan_response(uuid, uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: delete_plan
-- Restricted to the plan's creator or a group admin. Cascades to options,
-- instances, and responses.
-- ----------------------------------------------------------------------------
create or replace function public.delete_plan(p_plan_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_plan record;
  is_admin boolean;
begin
  select id, group_id, created_by into target_plan from public.plans where id = p_plan_id;
  if target_plan is null then
    raise exception 'plan not found';
  end if;

  select exists(
    select 1 from public.group_members
    where group_id = target_plan.group_id and user_id = auth.uid() and role = 'admin'
  ) into is_admin;

  if target_plan.created_by <> auth.uid() and not is_admin then
    raise exception 'only the plan''s creator or a group admin can delete it';
  end if;

  delete from public.plans where id = p_plan_id;
end;
$$;

revoke all on function public.delete_plan(uuid) from public;
grant execute on function public.delete_plan(uuid) to authenticated;
