-- Relay 1.0.6 daily schedule foundation.
-- Personal manual blocks live separately from provider/Planner events.
-- To-Dos gain an estimated duration and optional scheduled slot.

alter table public.todos
  add column if not exists estimated_minutes integer,
  add column if not exists scheduled_on date,
  add column if not exists scheduled_start time without time zone;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'todos_estimated_minutes_range'
  ) then
    alter table public.todos
      add constraint todos_estimated_minutes_range
      check (estimated_minutes is null or estimated_minutes between 5 and 720);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'todos_schedule_pair'
  ) then
    alter table public.todos
      add constraint todos_schedule_pair
      check ((scheduled_on is null) = (scheduled_start is null));
  end if;
end $$;

create index if not exists todos_user_scheduled_on_idx
  on public.todos (user_id, scheduled_on)
  where scheduled_on is not null;

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  occurs_on date not null,
  start_time time without time zone not null,
  end_time time without time zone not null,
  kind text not null default 'personal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_blocks_title_length check (char_length(btrim(title)) between 1 and 120),
  constraint schedule_blocks_time_order check (end_time > start_time),
  constraint schedule_blocks_kind check (kind in ('personal', 'focus', 'break', 'routine'))
);

create index if not exists schedule_blocks_user_day_idx
  on public.schedule_blocks (user_id, occurs_on, start_time);

alter table public.schedule_blocks enable row level security;

drop policy if exists schedule_blocks_select_own on public.schedule_blocks;
create policy schedule_blocks_select_own
  on public.schedule_blocks for select
  using ((select auth.uid()) = user_id);

drop policy if exists schedule_blocks_insert_own on public.schedule_blocks;
create policy schedule_blocks_insert_own
  on public.schedule_blocks for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists schedule_blocks_update_own on public.schedule_blocks;
create policy schedule_blocks_update_own
  on public.schedule_blocks for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists schedule_blocks_delete_own on public.schedule_blocks;
create policy schedule_blocks_delete_own
  on public.schedule_blocks for delete
  using ((select auth.uid()) = user_id);

revoke all on public.schedule_blocks from anon;
grant select, insert, update, delete on public.schedule_blocks to authenticated;
