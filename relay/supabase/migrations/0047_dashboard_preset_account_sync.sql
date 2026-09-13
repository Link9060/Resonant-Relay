create table if not exists public.user_ui_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  dashboard_presets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_ui_preferences_dashboard_presets_array check (jsonb_typeof(dashboard_presets) = 'array'),
  constraint user_ui_preferences_dashboard_presets_limit check (jsonb_array_length(dashboard_presets) <= 24)
);

alter table public.user_ui_preferences enable row level security;

drop policy if exists "user_ui_preferences_select_own" on public.user_ui_preferences;
create policy "user_ui_preferences_select_own"
on public.user_ui_preferences for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "user_ui_preferences_insert_own" on public.user_ui_preferences;
create policy "user_ui_preferences_insert_own"
on public.user_ui_preferences for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "user_ui_preferences_update_own" on public.user_ui_preferences;
create policy "user_ui_preferences_update_own"
on public.user_ui_preferences for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "user_ui_preferences_delete_own" on public.user_ui_preferences;
create policy "user_ui_preferences_delete_own"
on public.user_ui_preferences for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.user_ui_preferences to authenticated;
