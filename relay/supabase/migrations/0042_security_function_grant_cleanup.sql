-- RELAY — SECURITY FUNCTION GRANT CLEANUP
-- Trigger-only SECURITY DEFINER functions should never be client-callable.
-- Staff mutations should be authenticated-only at the privilege layer in
-- addition to their internal role checks.

revoke execute on function private.enforce_email_account_limit() from public, anon, authenticated;
revoke execute on function private.log_block_relationship_event() from public, anon, authenticated;
revoke execute on function private.log_connection_relationship_event() from public, anon, authenticated;

-- support_email_backend may be deployed independently of older repository
-- snapshots, so make this cleanup safe to apply either before or after it.
do $$
begin
  if to_regprocedure('public.staff_update_support_thread(uuid,text,uuid)') is not null then
    execute 'revoke execute on function public.staff_update_support_thread(uuid,text,uuid) from public, anon';
    execute 'grant execute on function public.staff_update_support_thread(uuid,text,uuid) to authenticated';
  end if;
end;
$$;
