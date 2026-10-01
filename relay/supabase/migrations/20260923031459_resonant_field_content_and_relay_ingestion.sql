-- RESONANT FIELD — CONTENT PAYLOADS + RELAY INGESTION
-- Keeps the graph payload small while allowing a selected node to expose
-- full note blocks, readable text, image/file preview metadata, and structured
-- todo/calendar content.

create table if not exists public.field_node_content (
  node_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  content_kind text not null,
  text_content text,
  structured_content jsonb,
  mime_type text,
  preview_bucket_id text,
  preview_object_path text,
  preview_alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint field_node_content_node_owner_fk
    foreign key (node_id, user_id)
    references public.field_nodes (id, user_id)
    on delete cascade,
  constraint field_node_content_kind_check check (
    content_kind in (
      'text', 'note_blocks', 'todo', 'calendar_event',
      'image', 'file', 'ravin_conversation', 'memory', 'structured'
    )
  ),
  constraint field_node_content_structured_object_or_array check (
    structured_content is null
    or jsonb_typeof(structured_content) in ('object', 'array')
  ),
  constraint field_node_content_preview_pair check (
    (preview_bucket_id is null and preview_object_path is null)
    or (preview_bucket_id is not null and preview_object_path is not null)
  )
);

create index if not exists field_node_content_user_kind_idx
  on public.field_node_content (user_id, content_kind, updated_at desc);

drop trigger if exists field_node_content_set_updated_at on public.field_node_content;
create trigger field_node_content_set_updated_at
  before update on public.field_node_content
  for each row execute function public.field_set_updated_at();

alter table public.field_node_content enable row level security;
grant select, insert, update, delete on public.field_node_content to authenticated;

create policy "field_node_content_select_own"
  on public.field_node_content for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_node_content_insert_own"
  on public.field_node_content for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "field_node_content_update_own"
  on public.field_node_content for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "field_node_content_delete_own"
  on public.field_node_content for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Helper: default source preferences
-- Relay notes/todos/calendar are indexed and available to RAVIN by default.
-- External AI remains off. Relay chats are intentionally not included here.
-- ---------------------------------------------------------------------------
create or replace function public.field_ensure_source_preference(
  p_user_id uuid,
  p_source_product text,
  p_source_type text,
  p_ravin_read boolean default false
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.field_source_preferences (
    user_id,
    source_product,
    source_type,
    indexed,
    ravin_read,
    external_ai_read,
    allow_writeback
  )
  values (
    p_user_id,
    p_source_product,
    p_source_type,
    true,
    p_ravin_read,
    false,
    false
  )
  on conflict (user_id, source_product, source_type) do nothing;
$$;

revoke all on function public.field_ensure_source_preference(uuid, text, text, boolean) from public;

-- ---------------------------------------------------------------------------
-- RELAY NOTES -> FIELD
-- ---------------------------------------------------------------------------
create or replace function public.field_sync_relay_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_node_id uuid;
  v_text text;
begin
  if tg_op = 'DELETE' then
    delete from public.field_nodes
      where user_id = old.user_id
        and source_product = 'relay'
        and source_id = old.id::text;
    return old;
  end if;

  select coalesce(string_agg(nullif(btrim(block ->> 'text'), ''), E'
'), '')
    into v_text
  from jsonb_array_elements(coalesce(new.content, '[]'::jsonb)) as block;

  insert into public.field_nodes (
    user_id,
    type,
    title,
    searchable_text,
    source_product,
    source_id,
    source_type,
    metadata
  )
  values (
    new.user_id,
    'note',
    coalesce(nullif(btrim(new.title), ''), 'Untitled'),
    nullif(v_text, ''),
    'relay',
    new.id::text,
    'note',
    jsonb_build_object(
      'is_pinned', new.is_pinned,
      'relay_updated_at', new.updated_at
    )
  )
  on conflict (user_id, source_product, source_id)
  do update set
    type = excluded.type,
    title = excluded.title,
    searchable_text = excluded.searchable_text,
    source_type = excluded.source_type,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_node_id;

  insert into public.field_node_content (
    node_id,
    user_id,
    content_kind,
    text_content,
    structured_content,
    mime_type
  )
  values (
    v_node_id,
    new.user_id,
    'note_blocks',
    nullif(v_text, ''),
    new.content,
    'application/json'
  )
  on conflict (node_id)
  do update set
    user_id = excluded.user_id,
    content_kind = excluded.content_kind,
    text_content = excluded.text_content,
    structured_content = excluded.structured_content,
    mime_type = excluded.mime_type,
    updated_at = now();

  perform public.field_ensure_source_preference(new.user_id, 'relay', 'note', true);
  return new;
end;
$$;

drop trigger if exists field_notes_sync on public.notes;
create trigger field_notes_sync
  after insert or update or delete on public.notes
  for each row execute function public.field_sync_relay_note();

-- ---------------------------------------------------------------------------
-- RELAY TODOS -> FIELD
-- ---------------------------------------------------------------------------
create or replace function public.field_sync_relay_todo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_node_id uuid;
begin
  if tg_op = 'DELETE' then
    delete from public.field_nodes
      where user_id = old.user_id
        and source_product = 'relay'
        and source_id = old.id::text;
    return old;
  end if;

  insert into public.field_nodes (
    user_id,
    type,
    title,
    searchable_text,
    source_product,
    source_id,
    source_type,
    metadata
  )
  values (
    new.user_id,
    'todo',
    new.title,
    concat_ws(' ', new.title, new.due_on::text, case when new.completed then 'completed' else 'open' end),
    'relay',
    new.id::text,
    'todo',
    jsonb_build_object(
      'due_on', new.due_on,
      'completed', new.completed,
      'position', new.position
    )
  )
  on conflict (user_id, source_product, source_id)
  do update set
    type = excluded.type,
    title = excluded.title,
    searchable_text = excluded.searchable_text,
    source_type = excluded.source_type,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_node_id;

  insert into public.field_node_content (
    node_id,
    user_id,
    content_kind,
    text_content,
    structured_content,
    mime_type
  )
  values (
    v_node_id,
    new.user_id,
    'todo',
    new.title,
    jsonb_build_object(
      'title', new.title,
      'due_on', new.due_on,
      'completed', new.completed,
      'position', new.position
    ),
    'application/json'
  )
  on conflict (node_id)
  do update set
    user_id = excluded.user_id,
    content_kind = excluded.content_kind,
    text_content = excluded.text_content,
    structured_content = excluded.structured_content,
    mime_type = excluded.mime_type,
    updated_at = now();

  perform public.field_ensure_source_preference(new.user_id, 'relay', 'todo', true);
  return new;
end;
$$;

drop trigger if exists field_todos_sync on public.todos;
create trigger field_todos_sync
  after insert or update or delete on public.todos
  for each row execute function public.field_sync_relay_todo();

-- ---------------------------------------------------------------------------
-- RELAY CALENDAR EVENTS -> FIELD
-- ---------------------------------------------------------------------------
create or replace function public.field_sync_relay_calendar_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_node_id uuid;
  v_text text;
begin
  if tg_op = 'DELETE' then
    delete from public.field_nodes
      where user_id = old.user_id
        and source_product = 'relay'
        and source_id = old.id::text;
    return old;
  end if;

  v_text := concat_ws(
    ' ',
    new.title,
    new.event_date::text,
    coalesce(new.details, ''),
    coalesce(new.start_time::text, ''),
    coalesce(new.end_time::text, '')
  );

  insert into public.field_nodes (
    user_id,
    type,
    title,
    searchable_text,
    source_product,
    source_id,
    source_type,
    metadata
  )
  values (
    new.user_id,
    'calendar_event',
    new.title,
    v_text,
    'relay',
    new.id::text,
    'calendar_event',
    jsonb_build_object(
      'event_date', new.event_date,
      'is_all_day', new.is_all_day,
      'start_time', new.start_time,
      'end_time', new.end_time
    )
  )
  on conflict (user_id, source_product, source_id)
  do update set
    type = excluded.type,
    title = excluded.title,
    searchable_text = excluded.searchable_text,
    source_type = excluded.source_type,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_node_id;

  insert into public.field_node_content (
    node_id,
    user_id,
    content_kind,
    text_content,
    structured_content,
    mime_type
  )
  values (
    v_node_id,
    new.user_id,
    'calendar_event',
    nullif(new.details, ''),
    jsonb_build_object(
      'title', new.title,
      'event_date', new.event_date,
      'is_all_day', new.is_all_day,
      'start_time', new.start_time,
      'end_time', new.end_time,
      'details', new.details
    ),
    'application/json'
  )
  on conflict (node_id)
  do update set
    user_id = excluded.user_id,
    content_kind = excluded.content_kind,
    text_content = excluded.text_content,
    structured_content = excluded.structured_content,
    mime_type = excluded.mime_type,
    updated_at = now();

  perform public.field_ensure_source_preference(new.user_id, 'relay', 'calendar_event', true);
  return new;
end;
$$;

drop trigger if exists field_relay_calendar_events_sync on public.relay_calendar_events;
create trigger field_relay_calendar_events_sync
  after insert or update or delete on public.relay_calendar_events
  for each row execute function public.field_sync_relay_calendar_event();

-- ---------------------------------------------------------------------------
-- BACKFILL EXISTING RELAY DATA
-- Reuse the trigger functions by issuing no-op updates. This keeps one canonical
-- transformation path for both historical and future data.
-- ---------------------------------------------------------------------------
update public.notes set updated_at = updated_at;
update public.todos set updated_at = updated_at;
update public.relay_calendar_events set updated_at = updated_at;

notify pgrst, 'reload schema';
