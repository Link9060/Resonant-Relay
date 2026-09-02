-- Explicitly remove the API's anonymous role in addition to PostgreSQL PUBLIC.
revoke execute on function public.mark_conversation_read(uuid) from anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;
notify pgrst, 'reload schema';
