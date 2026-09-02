-- RELAY — RESTORE CONTACT PREFERENCE WRITES
-- contact_preferences policies call are_connected as the authenticated user.
-- A prior hardening migration revoked this helper's execute privilege, causing
-- every nickname and message-color save to fail before the policy could run.

grant execute on function public.are_connected(uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
