-- RESONANT FIELD — CORE STORAGE
-- Portable Supabase/Postgres foundation for Resonant Assist products.
--
-- Design goals:
--   * auth.users is the only required product dependency.
--   * every user-owned row is protected by RLS.
--   * Relay/RAVIN/etc. reference their own source rows rather than moving
--     source-of-truth data into Field.
--   * files live in a private Storage bucket under <user-id>/...
--   * AI access is explicit per source type.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- NODES
-- ---------------------------------------------------------------------------
create table if not exists public.field_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  searchable_text text,
  source_product text not null,
  source_id text not null,
  source_type text not null default 'default',
  metadata jsonb not null default '{}'::jsonb,
  search_document tsvector generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(searchable_text, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint field_nodes_type_check check (
    type in (
      'note', 'file', 'todo', 'calendar_event', 'project',
      'ravin_conversation', 'chat', 'memory', 'link', 'other'
    )
  ),
  constraint field_nodes_title_length check (
    char_length(btrim(title)) between 1 and 240
  ),
  constraint field_nodes_source_product_length check (
    char_length(btrim(source_product)) between 1 and 80
  ),
  constraint field_nodes_source_id_length check (
    char_length(btrim(source_id)) between 1 and 240
  ),
  constraint field_nodes_source_type_length check (
    char_length(btrim(source_type)) between 1 and 80
  ),
  constraint field_nodes_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  ),
  constraint field_nodes_source_unique unique (user_id, source_product, source_id),
  constraint field_nodes_id_owner_unique unique (id, user_id)
);

create index if not exists field_nodes_user_type_updated_idx
  on public.field_nodes (user_id, type, updated_at desc);

create index if not exists field_nodes_user_source_idx
  on public.field_nodes (user_id, source_product, source_type);

create index if not exists field_nodes_search_idx
  on public.field_nodes using gin (search_document);

-- ---------------------------------------------------------------------------
-- EDGES
-- Composite foreign keys guarantee both endpoints belong to the same user.
-- ---------------------------------------------------------------------------
create table if not exists public.field_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_node_id uuid not null,
  target_node_id uuid not null,
  relation_type text not null,
  strength real not null default 1,
  origin text not null default 'system',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint field_edges_source_owner_fk
    foreign key (source_node_id, user_id)
    references public.field_nodes (id, user_id)
    on delete cascade,
  constraint field_edges_target_owner_fk
    foreign key (target_node_id, user_id)
    references public.field_nodes (id, user_id)
    on delete cascade,
  constraint field_edges_not_self check (source_node_id <> target_node_id),
  constraint field_edges_strength_check check (strength >= 0 and strength <= 1),
  constraint field_edges_origin_check check (origin in ('user', 'system', 'ravin')),
  constraint field_edges_relation_length check (
    char_length(btrim(relation_type)) between 1 and 80
  ),
  constraint field_edges_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint field_edges_unique_relation unique (
    user_id, source_node_id, target_node_id, relation_type
  )
);

create index if not exists field_edges_source_idx
  on public.field_edges (user_id, source_node_id, strength desc);

create index if not exists field_edges_target_idx
  on public.field_edges (user_id, target_node_id, strength desc);

-- ---------------------------------------------------------------------------
-- SOURCE PREFERENCES / AI PERMISSIONS
-- These are user-controlled defaults for a source category. A future per-node
-- override can layer on top without changing the node schema.
-- ---------------------------------------------------------------------------
create table if not exists public.field_source_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  source_product text not null,
  source_type text not null default 'default',
  indexed boolean not null default true,
  ravin_read boolean not null default false,
  external_ai_read boolean not null default false,
  allow_writeback boolean not null default false,
  updated_at timestamptz not null default now(),

  primary key (user_id, source_product, source_type),
  constraint field_source_preferences_product_length check (
    char_length(btrim(source_product)) between 1 and 80
  ),
  constraint field_source_preferences_type_length check (
    char_length(btrim(source_type)) between 1 and 80
  )
);

-- ---------------------------------------------------------------------------
-- FILE METADATA + EXTRACTED CHUNKS
-- Original bytes are stored in Supabase Storage, not in Postgres.
-- ---------------------------------------------------------------------------
create table if not exists public.field_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  node_id uuid not null,
  bucket_id text not null default 'field-files',
  object_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint not null,
  checksum_sha256 text,
  extraction_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint field_files_node_owner_fk
    foreign key (node_id, user_id)
    references public.field_nodes (id, user_id)
    on delete cascade,
  constraint field_files_node_unique unique (node_id),
  constraint field_files_object_unique unique (bucket_id, object_path),
  constraint field_files_size_check check (
    size_bytes >= 0 and size_bytes <= 52428800
  ),
  constraint field_files_extraction_status_check check (
    extraction_status in ('pending', 'processing', 'ready', 'failed')
  ),
  constraint field_files_path_owner_check check (
    split_part(object_path, '/', 1) = user_id::text
  )
);

create index if not exists field_files_user_created_idx
  on public.field_files (user_id, created_at desc);

create table if not exists public.field_chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  node_id uuid not null,
  ordinal integer not null,
  content text not null,
  token_count integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint field_chunks_node_owner_fk
    foreign key (node_id, user_id)
    references public.field_nodes (id, user_id)
    on delete cascade,
  constraint field_chunks_ordinal_check check (ordinal >= 0),
  constraint field_chunks_token_count_check check (
    token_count is null or token_count >= 0
  ),
  constraint field_chunks_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint field_chunks_node_ordinal_unique unique (node_id, ordinal)
);

create index if not exists field_chunks_user_node_idx
  on public.field_chunks (user_id, node_id, ordinal);

-- ---------------------------------------------------------------------------
-- UPDATED_AT
-- ---------------------------------------------------------------------------
create or replace function public.field_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists field_nodes_set_updated_at on public.field_nodes;
create trigger field_nodes_set_updated_at
  before update on public.field_nodes
  for each row execute function public.field_set_updated_at();

drop trigger if exists field_edges_set_updated_at on public.field_edges;
create trigger field_edges_set_updated_at
  before update on public.field_edges
  for each row execute function public.field_set_updated_at();

drop trigger if exists field_source_preferences_set_updated_at on public.field_source_preferences;
create trigger field_source_preferences_set_updated_at
  before update on public.field_source_preferences
  for each row execute function public.field_set_updated_at();

drop trigger if exists field_files_set_updated_at on public.field_files;
create trigger field_files_set_updated_at
  before update on public.field_files
  for each row execute function public.field_set_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.field_nodes enable row level security;
alter table public.field_edges enable row level security;
alter table public.field_source_preferences enable row level security;
alter table public.field_files enable row level security;
alter table public.field_chunks enable row level security;

grant select, insert, update, delete on public.field_nodes to authenticated;
grant select, insert, update, delete on public.field_edges to authenticated;
grant select, insert, update, delete on public.field_source_preferences to authenticated;
grant select, insert, update, delete on public.field_files to authenticated;
grant select, insert, update, delete on public.field_chunks to authenticated;

create policy "field_nodes_select_own"
  on public.field_nodes for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_nodes_insert_own"
  on public.field_nodes for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "field_nodes_update_own"
  on public.field_nodes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "field_nodes_delete_own"
  on public.field_nodes for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_edges_select_own"
  on public.field_edges for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_edges_insert_own"
  on public.field_edges for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "field_edges_update_own"
  on public.field_edges for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "field_edges_delete_own"
  on public.field_edges for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_source_preferences_select_own"
  on public.field_source_preferences for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_source_preferences_insert_own"
  on public.field_source_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "field_source_preferences_update_own"
  on public.field_source_preferences for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "field_source_preferences_delete_own"
  on public.field_source_preferences for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_files_select_own"
  on public.field_files for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_files_insert_own"
  on public.field_files for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "field_files_update_own"
  on public.field_files for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "field_files_delete_own"
  on public.field_files for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_chunks_select_own"
  on public.field_chunks for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_chunks_insert_own"
  on public.field_chunks for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "field_chunks_update_own"
  on public.field_chunks for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "field_chunks_delete_own"
  on public.field_chunks for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- SEARCH RPCs
-- field_search_nodes: normal signed-in user search.
-- field_search_ravin: same search, but only sources explicitly granted to RAVIN.
-- ---------------------------------------------------------------------------
create or replace function public.field_search_nodes(
  p_query text,
  p_limit integer default 20,
  p_types text[] default null
)
returns table (
  id uuid,
  type text,
  title text,
  source_product text,
  source_id text,
  source_type text,
  metadata jsonb,
  updated_at timestamptz,
  score real
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    n.id,
    n.type,
    n.title,
    n.source_product,
    n.source_id,
    n.source_type,
    n.metadata,
    n.updated_at,
    (
      ts_rank_cd(n.search_document, websearch_to_tsquery('simple', p_query))
      + case when lower(n.title) like '%' || lower(p_query) || '%' then 1 else 0 end
    )::real as score
  from public.field_nodes n
  where n.user_id = (select auth.uid())
    and btrim(coalesce(p_query, '')) <> ''
    and (p_types is null or n.type = any(p_types))
    and (
      n.search_document @@ websearch_to_tsquery('simple', p_query)
      or lower(n.title) like '%' || lower(p_query) || '%'
    )
  order by score desc, n.updated_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create or replace function public.field_search_ravin(
  p_query text,
  p_limit integer default 20,
  p_types text[] default null
)
returns table (
  id uuid,
  type text,
  title text,
  source_product text,
  source_id text,
  source_type text,
  metadata jsonb,
  updated_at timestamptz,
  score real
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    n.id,
    n.type,
    n.title,
    n.source_product,
    n.source_id,
    n.source_type,
    n.metadata,
    n.updated_at,
    (
      ts_rank_cd(n.search_document, websearch_to_tsquery('simple', p_query))
      + case when lower(n.title) like '%' || lower(p_query) || '%' then 1 else 0 end
    )::real as score
  from public.field_nodes n
  join public.field_source_preferences p
    on p.user_id = n.user_id
   and p.source_product = n.source_product
   and p.source_type = n.source_type
  where n.user_id = (select auth.uid())
    and p.indexed
    and p.ravin_read
    and btrim(coalesce(p_query, '')) <> ''
    and (p_types is null or n.type = any(p_types))
    and (
      n.search_document @@ websearch_to_tsquery('simple', p_query)
      or lower(n.title) like '%' || lower(p_query) || '%'
    )
  order by score desc, n.updated_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

revoke all on function public.field_search_nodes(text, integer, text[]) from public;
revoke all on function public.field_search_ravin(text, integer, text[]) from public;
grant execute on function public.field_search_nodes(text, integer, text[]) to authenticated;
grant execute on function public.field_search_ravin(text, integer, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- PRIVATE FILE STORAGE
-- Paths MUST be <auth.uid()>/<generated-id>/<filename>.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('field-files', 'field-files', false, 52428800)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit;

create policy "field_storage_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'field-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "field_storage_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'field-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "field_storage_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'field-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'field-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "field_storage_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'field-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

notify pgrst, 'reload schema';
