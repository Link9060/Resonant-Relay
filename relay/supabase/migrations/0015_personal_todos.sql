-- RELAY — PERSONAL TO DOS
-- Private, date-based tasks used by the weekly To Do view and dashboard.

create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  due_on date not null,
  completed boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint todos_title_length check (char_length(trim(title)) between 1 and 120),
  constraint todos_position_nonnegative check (position >= 0)
);

create index todos_user_due_idx on public.todos (user_id, due_on, completed, position, created_at);

create trigger todos_set_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();

alter table public.todos enable row level security;
grant select, insert, update, delete on public.todos to authenticated;

create policy "todos_select_own"
  on public.todos for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "todos_insert_own"
  on public.todos for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "todos_update_own"
  on public.todos for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "todos_delete_own"
  on public.todos for delete to authenticated
  using ((select auth.uid()) = user_id);

notify pgrst, 'reload schema';
