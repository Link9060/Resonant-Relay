-- RELAY 1.0.7 — PER-USER CONVERSATION DELETION
-- A user can remove a conversation from their own Chats view without destroying shared history.

alter table public.conversation_preferences
  add column if not exists deleted_at timestamptz;

create index if not exists conversation_preferences_user_deleted_idx
  on public.conversation_preferences (user_id, deleted_at);

notify pgrst, 'reload schema';
