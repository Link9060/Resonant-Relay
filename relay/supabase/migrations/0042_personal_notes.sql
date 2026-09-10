-- Private block-based notes for the Relay 1.0.3 knowledge workspace.
-- Notes remain separate records so future graph edges, file attachments, and
-- RAVIN permissions can reference a durable note id.

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled',
  content jsonb not null default '[]'::jsonb,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_title_length check (char_length(trim(title)) between 1 and 120),
  constraint notes_content_is_array check (jsonb_typeof(content) = 'array'),
  constraint notes_content_size check (octet_length(content::text) <= 250000)
);

create index notes_user_updated_idx
  on public.notes (user_id, is_pinned desc, updated_at desc);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;
grant select, insert, update, delete on public.notes to authenticated;

create policy "notes_select_own"
  on public.notes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "notes_insert_own"
  on public.notes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "notes_update_own"
  on public.notes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "notes_delete_own"
  on public.notes for delete to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.notes is
  'Private block documents owned by one Relay user; designed for future graph, attachment, and RAVIN integrations.';
