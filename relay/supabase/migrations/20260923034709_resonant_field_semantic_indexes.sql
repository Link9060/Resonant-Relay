-- RESONANT FIELD — SEMANTIC INDEX HARDENING
create index if not exists field_embeddings_node_owner_idx
  on public.field_embeddings (node_id, user_id);

create index if not exists field_semantic_neighbors_node_owner_idx
  on public.field_semantic_neighbors (node_id, user_id);
