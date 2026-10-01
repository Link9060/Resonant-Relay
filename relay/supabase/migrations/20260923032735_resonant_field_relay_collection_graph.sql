-- RESONANT FIELD — RELAY COLLECTION GRAPH
-- Adds durable collection nodes and system edges so Relay data has an
-- immediate navigable hierarchy before semantic/AI relationships are added.

-- Allow collection nodes in the universal Field node type set.
alter table public.field_nodes
  drop constraint if exists field_nodes_type_check;

alter table public.field_nodes
  add constraint field_nodes_type_check check (
    type in (
      'note', 'file', 'todo', 'calendar_event', 'project', 'collection',
      'ravin_conversation', 'chat', 'memory', 'link', 'other'
    )
  );

create or replace function public.field_collection_slug(p_source_type text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_source_type
    when 'note' then 'notes'
    when 'todo' then 'todos'
    when 'calendar_event' then 'calendar'
    when 'file' then 'files'
    when 'image' then 'files'
    else null
  end;
$$;

create or replace function public.field_collection_title(p_slug text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_slug
    when 'notes' then 'Notes'
    when 'todos' then 'Todos'
    when 'calendar' then 'Calendar'
    when 'files' then 'Files'
    else initcap(coalesce(p_slug, 'Collection'))
  end;
$$;

create or replace function public.field_connect_relay_node(
  p_user_id uuid,
  p_node_id uuid,
  p_source_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_root_id uuid;
  v_collection_id uuid;
  v_slug text;
begin
  v_slug := public.field_collection_slug(p_source_type);
  if v_slug is null then
    return;
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
    p_user_id,
    'collection',
    'Relay',
    'Relay workspace knowledge',
    'field-system',
    'relay-workspace',
    'workspace',
    jsonb_build_object('system', true, 'product', 'relay')
  )
  on conflict (user_id, source_product, source_id)
  do update set
    title = excluded.title,
    searchable_text = excluded.searchable_text,
    type = excluded.type,
    source_type = excluded.source_type,
    metadata = excluded.metadata
  returning id into v_root_id;

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
    p_user_id,
    'collection',
    public.field_collection_title(v_slug),
    public.field_collection_title(v_slug) || ' in Relay',
    'field-system',
    'relay-' || v_slug,
    'collection',
    jsonb_build_object('system', true, 'product', 'relay', 'collection', v_slug)
  )
  on conflict (user_id, source_product, source_id)
  do update set
    title = excluded.title,
    searchable_text = excluded.searchable_text,
    type = excluded.type,
    source_type = excluded.source_type,
    metadata = excluded.metadata
  returning id into v_collection_id;

  insert into public.field_edges (
    user_id,
    source_node_id,
    target_node_id,
    relation_type,
    strength,
    origin,
    metadata
  )
  values (
    p_user_id,
    v_root_id,
    v_collection_id,
    'contains',
    1,
    'system',
    jsonb_build_object('system', true)
  )
  on conflict (user_id, source_node_id, target_node_id, relation_type)
  do update set
    strength = excluded.strength,
    origin = excluded.origin,
    metadata = excluded.metadata;

  insert into public.field_edges (
    user_id,
    source_node_id,
    target_node_id,
    relation_type,
    strength,
    origin,
    metadata
  )
  values (
    p_user_id,
    v_collection_id,
    p_node_id,
    'contains',
    1,
    'system',
    jsonb_build_object('system', true)
  )
  on conflict (user_id, source_node_id, target_node_id, relation_type)
  do update set
    strength = excluded.strength,
    origin = excluded.origin,
    metadata = excluded.metadata;
end;
$$;

create or replace function public.field_connect_relay_node_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source_product = 'relay'
     and new.source_type in ('note', 'todo', 'calendar_event', 'file', 'image')
     and new.type <> 'collection' then
    perform public.field_connect_relay_node(new.user_id, new.id, new.source_type);
  end if;
  return new;
end;
$$;

drop trigger if exists field_nodes_connect_relay on public.field_nodes;
create trigger field_nodes_connect_relay
  after insert or update of type, source_product, source_type on public.field_nodes
  for each row execute function public.field_connect_relay_node_trigger();

-- Backfill every existing Relay node through the same canonical linker.
do $$
declare
  r record;
begin
  for r in
    select id, user_id, source_type
    from public.field_nodes
    where source_product = 'relay'
      and source_type in ('note', 'todo', 'calendar_event', 'file', 'image')
      and type <> 'collection'
  loop
    perform public.field_connect_relay_node(r.user_id, r.id, r.source_type);
  end loop;
end;
$$;

-- These are internal graph-maintenance helpers, never public RPCs.
revoke all on function public.field_collection_slug(text) from public;
revoke all on function public.field_collection_title(text) from public;
revoke all on function public.field_connect_relay_node(uuid, uuid, text) from public;
revoke all on function public.field_connect_relay_node_trigger() from public;
revoke execute on function public.field_collection_slug(text) from anon, authenticated;
revoke execute on function public.field_collection_title(text) from anon, authenticated;
revoke execute on function public.field_connect_relay_node(uuid, uuid, text) from anon, authenticated;
revoke execute on function public.field_connect_relay_node_trigger() from anon, authenticated;

notify pgrst, 'reload schema';
