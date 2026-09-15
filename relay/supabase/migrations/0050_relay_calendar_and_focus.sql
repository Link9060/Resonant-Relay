-- RELAY 1.0.7 — RELAY-NATIVE CALENDAR AND FOCUS HISTORY

create table if not exists public.relay_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  event_date date not null,
  is_all_day boolean not null default false,
  start_time time,
  end_time time,
  details text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint relay_calendar_events_title_length check (char_length(trim(title)) between 1 and 120),
  constraint relay_calendar_events_details_length check (details is null or char_length(details) <= 1000),
  constraint relay_calendar_events_time_required check (is_all_day or start_time is not null),
  constraint relay_calendar_events_time_order check (end_time is null or start_time is null or end_time > start_time)
);

create index if not exists relay_calendar_events_user_date_idx
  on public.relay_calendar_events (user_id, event_date, start_time, created_at);

drop trigger if exists relay_calendar_events_set_updated_at on public.relay_calendar_events;
create trigger relay_calendar_events_set_updated_at
  before update on public.relay_calendar_events
  for each row execute function public.set_updated_at();

alter table public.relay_calendar_events enable row level security;
grant select, insert, update, delete on public.relay_calendar_events to authenticated;

create policy "relay_calendar_events_select_own"
  on public.relay_calendar_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "relay_calendar_events_insert_own"
  on public.relay_calendar_events for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "relay_calendar_events_update_own"
  on public.relay_calendar_events for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "relay_calendar_events_delete_own"
  on public.relay_calendar_events for delete to authenticated
  using ((select auth.uid()) = user_id);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  todo_id uuid,
  task_title text,
  mode text not null default 'focus' check (mode in ('focus', 'break')),
  planned_minutes integer not null check (planned_minutes between 1 and 480),
  elapsed_seconds integer not null default 0 check (elapsed_seconds between 0 and 86400),
  completed boolean not null default false,
  started_at timestamptz not null,
  ended_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint focus_sessions_task_title_length check (task_title is null or char_length(task_title) <= 120)
);

create index if not exists focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at desc);

alter table public.focus_sessions enable row level security;
grant select, insert, delete on public.focus_sessions to authenticated;

create policy "focus_sessions_select_own"
  on public.focus_sessions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "focus_sessions_insert_own"
  on public.focus_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "focus_sessions_delete_own"
  on public.focus_sessions for delete to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
