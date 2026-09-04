-- RELAY — HARDEN STAFF / OWNER RPC PERMISSIONS
-- PostgreSQL grants EXECUTE on functions to PUBLIC by default. Remove that
-- implicit access and expose only the signed-in RPCs Relay actually needs.

alter function public.role_rank(public.app_role) set search_path = public;

revoke execute on function public.current_app_role() from public, anon;
revoke execute on function public.has_staff_role(public.app_role) from public, anon;
revoke execute on function public.set_user_role(uuid, public.app_role) from public, anon;
revoke execute on function public.admin_list_users(integer, integer) from public, anon;
revoke execute on function public.owner_dashboard_stats() from public, anon;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.has_staff_role(public.app_role) to authenticated;
grant execute on function public.set_user_role(uuid, public.app_role) to authenticated;
grant execute on function public.admin_list_users(integer, integer) to authenticated;
grant execute on function public.owner_dashboard_stats() to authenticated;
