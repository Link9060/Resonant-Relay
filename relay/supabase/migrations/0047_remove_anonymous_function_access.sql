-- No application RPC is intended for signed-out callers. role_rank is a pure
-- helper used by authenticated/privileged code, so remove the final anon EXECUTE.

revoke execute on function public.role_rank(public.app_role) from anon;
