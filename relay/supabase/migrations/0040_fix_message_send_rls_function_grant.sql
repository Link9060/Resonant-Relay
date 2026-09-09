-- Restore the EXECUTE privilege required by the messages INSERT RLS policy.
-- The policy calls private.can_send_to_conversation(...) for authenticated
-- users; without this grant, every client message insert fails with 42501.

grant execute on function private.can_send_to_conversation(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
