-- RELAY — MESSAGE INSERT LEAST PRIVILEGE
-- Keep server-owned ids and timestamps out of direct browser writes so the
-- 15-minute edit window cannot be extended by supplying a custom created_at.

revoke insert on public.messages from authenticated;
grant insert (conversation_id, sender_id, body) on public.messages to authenticated;

notify pgrst, 'reload schema';
