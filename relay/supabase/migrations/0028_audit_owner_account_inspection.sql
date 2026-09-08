-- RELAY — AUDIT OWNER ACCOUNT INSPECTION
-- Deep Owner inspection exposes sensitive account metadata (contacts, groups,
-- sessions, storage and conversation metadata), so every successful view gets
-- an audit record. The underlying read function is no longer directly callable.

alter function public.owner_user_inspector(uuid) rename to owner_user_inspector_read;

revoke all on function public.owner_user_inspector_read(uuid) from public, anon, authenticated;

create or replace function public.owner_user_inspector(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  if not public.has_staff_role('owner') then raise exception 'owner permission required'; end if;

  v_result := public.owner_user_inspector_read(p_user_id);

  insert into public.admin_audit_log(actor_id, action, target_user_id, metadata)
  values (
    auth.uid(),
    'inspect_user_account',
    p_user_id,
    jsonb_build_object('scope', 'owner_deep_inspector')
  );

  return v_result;
end;
$$;

revoke all on function public.owner_user_inspector(uuid) from public, anon;
grant execute on function public.owner_user_inspector(uuid) to authenticated;
