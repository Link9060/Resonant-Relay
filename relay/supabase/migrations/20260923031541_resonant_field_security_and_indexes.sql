-- RESONANT FIELD — SECURITY + INDEX HARDENING

-- Trigger/helper functions are internal implementation details. They should not
-- be callable through PostgREST by anonymous or signed-in clients.
revoke execute on function public.field_ensure_source_preference(uuid, text, text, boolean) from anon, authenticated;
revoke execute on function public.field_sync_relay_note() from anon, authenticated;
revoke execute on function public.field_sync_relay_todo() from anon, authenticated;
revoke execute on function public.field_sync_relay_calendar_event() from anon, authenticated;
revoke execute on function public.field_set_updated_at() from anon, authenticated;

-- Cover the composite foreign-key column order used by Field.
create index if not exists field_edges_source_owner_idx
  on public.field_edges (source_node_id, user_id);

create index if not exists field_edges_target_owner_idx
  on public.field_edges (target_node_id, user_id);

create index if not exists field_files_node_owner_idx
  on public.field_files (node_id, user_id);

create index if not exists field_chunks_node_owner_idx
  on public.field_chunks (node_id, user_id);

create index if not exists field_node_content_node_owner_idx
  on public.field_node_content (node_id, user_id);
