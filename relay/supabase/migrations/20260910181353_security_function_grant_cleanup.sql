revoke execute on function public.staff_update_support_thread(uuid,text,uuid) from public, anon;
grant execute on function public.staff_update_support_thread(uuid,text,uuid) to authenticated;

revoke execute on function private.enforce_email_account_limit() from public, anon, authenticated;
revoke execute on function private.log_block_relationship_event() from public, anon, authenticated;
revoke execute on function private.log_connection_relationship_event() from public, anon, authenticated;
