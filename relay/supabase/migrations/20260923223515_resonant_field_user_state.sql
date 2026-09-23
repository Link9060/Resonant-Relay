-- RESONANT FIELD — USER BUILD / SYNC STATE
create table if not exists public.field_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  built_at timestamptz,
  last_synced_at timestamptz,
  layout_version integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint field_user_state_layout_version_check check (layout_version >= 1)
);

drop trigger if exists field_user_state_set_updated_at on public.field_user_state;
create trigger field_user_state_set_updated_at
  before update on public.field_user_state
  for each row execute function public.field_set_updated_at();

alter table public.field_user_state enable row level security;
grant select, insert, update, delete on public.field_user_state to authenticated;

create policy "field_user_state_select_own"
  on public.field_user_state for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_user_state_insert_own"
  on public.field_user_state for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "field_user_state_update_own"
  on public.field_user_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "field_user_state_delete_own"
  on public.field_user_state for delete to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
