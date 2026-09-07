-- RELAY — HARDEN STAFF REQUEST RPCS
-- Remove PostgreSQL's default PUBLIC execute grant and pin helper search_path.

create or replace function public.staff_can_view_request_type(
  p_role public.app_role,
  p_request_type text
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case p_role
    when 'owner' then true
    when 'admin' then p_request_type in ('bug_report', 'feature_request', 'safety_report', 'general_feedback')
    when 'moderator' then p_request_type = 'safety_report'
    else false
  end;
$$;

revoke all on function public.staff_can_view_request_type(public.app_role, text) from public;
revoke all on function public.staff_can_view_request_type(public.app_role, text) from anon;
grant execute on function public.staff_can_view_request_type(public.app_role, text) to authenticated;

revoke all on function public.submit_staff_request(text, text, text, public.app_role, jsonb) from public;
revoke all on function public.submit_staff_request(text, text, text, public.app_role, jsonb) from anon;
grant execute on function public.submit_staff_request(text, text, text, public.app_role, jsonb) to authenticated;

revoke all on function public.staff_list_requests(text, integer, integer) from public;
revoke all on function public.staff_list_requests(text, integer, integer) from anon;
grant execute on function public.staff_list_requests(text, integer, integer) to authenticated;

revoke all on function public.staff_update_request_status(uuid, text, text) from public;
revoke all on function public.staff_update_request_status(uuid, text, text) from anon;
grant execute on function public.staff_update_request_status(uuid, text, text) to authenticated;

revoke all on function public.owner_approve_role_request(uuid, text) from public;
revoke all on function public.owner_approve_role_request(uuid, text) from anon;
grant execute on function public.owner_approve_role_request(uuid, text) to authenticated;
