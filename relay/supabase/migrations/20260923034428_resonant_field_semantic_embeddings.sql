-- RESONANT FIELD — SEMANTIC EMBEDDINGS + AUTOMATIC RELATIONSHIPS
-- Uses Supabase gte-small (384 dimensions) through an Edge Function.
-- Structural edges remain origin='system'; generated semantic edges use
-- origin='ravin' with metadata.layer='semantic'.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- EMBEDDING STATE
-- ---------------------------------------------------------------------------
create table if not exists public.field_embeddings (
  node_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  embedding extensions.vector(384),
  model text not null default 'gte-small',
  status text not null default 'pending',
  last_error text,
  embedded_at timestamptz,
  updated_at timestamptz not null default now(),

  constraint field_embeddings_node_owner_fk
    foreign key (node_id, user_id)
    references public.field_nodes (id, user_id)
    on delete cascade,
  constraint field_embeddings_status_check
    check (status in ('pending', 'processing', 'ready', 'failed')),
  constraint field_embeddings_model_length
    check (char_length(btrim(model)) between 1 and 80),
  constraint field_embeddings_error_length
    check (last_error is null or char_length(last_error) <= 2000)
);

create index if not exists field_embeddings_user_status_idx
  on public.field_embeddings (user_id, status, updated_at);

create index if not exists field_embeddings_hnsw_idx
  on public.field_embeddings
  using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

-- Directional nearest-neighbor cache. This is intentionally separate from
-- field_edges: it can be regenerated freely, then collapsed into one graph edge
-- per unordered pair.
create table if not exists public.field_semantic_neighbors (
  user_id uuid not null references auth.users (id) on delete cascade,
  node_id uuid not null,
  related_node_id uuid not null,
  similarity real not null,
  rank smallint not null,
  model text not null default 'gte-small',
  updated_at timestamptz not null default now(),

  primary key (user_id, node_id, related_node_id),
  constraint field_semantic_neighbors_node_fk
    foreign key (node_id, user_id)
    references public.field_nodes (id, user_id)
    on delete cascade,
  constraint field_semantic_neighbors_related_fk
    foreign key (related_node_id, user_id)
    references public.field_nodes (id, user_id)
    on delete cascade,
  constraint field_semantic_neighbors_not_self check (node_id <> related_node_id),
  constraint field_semantic_neighbors_similarity check (similarity >= 0 and similarity <= 1),
  constraint field_semantic_neighbors_rank check (rank between 1 and 50)
);

create index if not exists field_semantic_neighbors_related_idx
  on public.field_semantic_neighbors (related_node_id, user_id);

-- ---------------------------------------------------------------------------
-- RLS
-- Users may read their semantic state, but only the trusted semantic worker
-- writes embeddings/neighbors. Graph consumers read generated relationships
-- through the normal field_edges RLS policies.
-- ---------------------------------------------------------------------------
alter table public.field_embeddings enable row level security;
alter table public.field_semantic_neighbors enable row level security;

grant select on public.field_embeddings to authenticated;
grant select on public.field_semantic_neighbors to authenticated;

create policy "field_embeddings_select_own"
  on public.field_embeddings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "field_semantic_neighbors_select_own"
  on public.field_semantic_neighbors for select to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- PENDING INVALIDATION
-- ---------------------------------------------------------------------------
create or replace function public.field_mark_embedding_pending(
  p_user_id uuid,
  p_node_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.field_embeddings (
    node_id, user_id, embedding, model, status, last_error, embedded_at
  )
  select
    n.id, n.user_id, null, 'gte-small', 'pending', null, null
  from public.field_nodes n
  where n.id = p_node_id
    and n.user_id = p_user_id
    and n.type <> 'collection'
    and n.source_product <> 'field-system'
  on conflict (node_id)
  do update set
    user_id = excluded.user_id,
    embedding = null,
    model = excluded.model,
    status = 'pending',
    last_error = null,
    embedded_at = null,
    updated_at = now();
$$;

create or replace function public.field_nodes_embedding_pending_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.field_mark_embedding_pending(new.user_id, new.id);
  return new;
end;
$$;

create or replace function public.field_content_embedding_pending_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.field_mark_embedding_pending(old.user_id, old.node_id);
    return old;
  end if;

  perform public.field_mark_embedding_pending(new.user_id, new.node_id);
  return new;
end;
$$;

drop trigger if exists field_nodes_embedding_pending on public.field_nodes;
create trigger field_nodes_embedding_pending
  after insert or update of title, searchable_text on public.field_nodes
  for each row execute function public.field_nodes_embedding_pending_trigger();

drop trigger if exists field_node_content_embedding_pending on public.field_node_content;
create trigger field_node_content_embedding_pending
  after insert or update of text_content, structured_content or delete
  on public.field_node_content
  for each row execute function public.field_content_embedding_pending_trigger();

-- Backfill all current user content.
insert into public.field_embeddings (node_id, user_id, status)
select n.id, n.user_id, 'pending'
from public.field_nodes n
where n.type <> 'collection'
  and n.source_product <> 'field-system'
on conflict (node_id) do nothing;

-- ---------------------------------------------------------------------------
-- SERVICE-ROLE SEMANTIC MAINTENANCE
-- ---------------------------------------------------------------------------
create or replace function public.field_rebuild_semantic_neighbors(
  p_user_id uuid,
  p_node_id uuid,
  p_threshold real default 0.72,
  p_limit integer default 8
)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_inserted integer := 0;
begin
  if p_threshold < 0 or p_threshold > 1 then
    raise exception 'semantic threshold must be between 0 and 1';
  end if;

  delete from public.field_semantic_neighbors
  where user_id = p_user_id
    and node_id = p_node_id;

  with source_embedding as (
    select e.embedding
    from public.field_embeddings e
    where e.user_id = p_user_id
      and e.node_id = p_node_id
      and e.status = 'ready'
      and e.embedding is not null
  ),
  candidates as (
    select
      e.node_id as related_node_id,
      (1 - (e.embedding <=> s.embedding))::real as similarity
    from public.field_embeddings e
    cross join source_embedding s
    join public.field_nodes n
      on n.id = e.node_id
     and n.user_id = e.user_id
    where e.user_id = p_user_id
      and e.node_id <> p_node_id
      and e.status = 'ready'
      and e.embedding is not null
      and n.type <> 'collection'
      and n.source_product <> 'field-system'
      and (1 - (e.embedding <=> s.embedding)) >= p_threshold
    order by e.embedding <=> s.embedding
    limit least(greatest(coalesce(p_limit, 8), 1), 20)
  ),
  ranked as (
    select
      related_node_id,
      similarity,
      row_number() over (order by similarity desc)::smallint as rank
    from candidates
  )
  insert into public.field_semantic_neighbors (
    user_id, node_id, related_node_id, similarity, rank, model
  )
  select
    p_user_id,
    p_node_id,
    related_node_id,
    similarity,
    rank,
    'gte-small'
  from ranked;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.field_materialize_semantic_edges(
  p_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer := 0;
begin
  delete from public.field_edges
  where user_id = p_user_id
    and origin = 'ravin'
    and relation_type = 'semantic_related'
    and metadata ->> 'layer' = 'semantic';

  with pairs as (
    select
      case when node_id::text < related_node_id::text then node_id else related_node_id end as a,
      case when node_id::text < related_node_id::text then related_node_id else node_id end as b,
      max(similarity)::real as similarity,
      bool_or(reverse_link.user_id is not null) as mutual
    from public.field_semantic_neighbors n
    left join public.field_semantic_neighbors reverse_link
      on reverse_link.user_id = n.user_id
     and reverse_link.node_id = n.related_node_id
     and reverse_link.related_node_id = n.node_id
    where n.user_id = p_user_id
    group by 1, 2
  )
  insert into public.field_edges (
    user_id,
    source_node_id,
    target_node_id,
    relation_type,
    strength,
    origin,
    metadata
  )
  select
    p_user_id,
    a,
    b,
    'semantic_related',
    similarity,
    'ravin',
    jsonb_build_object(
      'layer', 'semantic',
      'model', 'gte-small',
      'mutual', mutual,
      'generated', true
    )
  from pairs
  where similarity >= 0.72
  on conflict (user_id, source_node_id, target_node_id, relation_type)
  do update set
    strength = excluded.strength,
    origin = excluded.origin,
    metadata = excluded.metadata,
    updated_at = now();

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- Internal-only helpers. Only the service role used by the Edge Function may
-- rebuild semantic state.
revoke all on function public.field_mark_embedding_pending(uuid, uuid) from public, anon, authenticated;
revoke all on function public.field_nodes_embedding_pending_trigger() from public, anon, authenticated;
revoke all on function public.field_content_embedding_pending_trigger() from public, anon, authenticated;
revoke all on function public.field_rebuild_semantic_neighbors(uuid, uuid, real, integer) from public, anon, authenticated;
revoke all on function public.field_materialize_semantic_edges(uuid) from public, anon, authenticated;

grant execute on function public.field_rebuild_semantic_neighbors(uuid, uuid, real, integer) to service_role;
grant execute on function public.field_materialize_semantic_edges(uuid) to service_role;

notify pgrst, 'reload schema';
