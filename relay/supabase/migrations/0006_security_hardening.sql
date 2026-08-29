-- ============================================================================
-- RELAY — SECURITY HARDENING
-- Tightens function privileges that Postgres/Supabase grant by default and
-- fixes mutable search paths reported by the Supabase database linter.
-- ============================================================================

-- Trigger/helper functions are internal implementation details. They do not
-- need to be callable through PostgREST by browser roles.
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.generate_relay_number() set search_path = public, pg_temp;
alter function public.touch_conversation_on_message() set search_path = public, pg_temp;
alter function public.are_connected(uuid, uuid) set search_path = public, pg_temp;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.generate_relay_number() from public, anon, authenticated;
revoke execute on function public.touch_conversation_on_message() from public, anon, authenticated;
revoke execute on function public.are_connected(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- User-facing RPCs deliberately run as SECURITY DEFINER, but every function
-- validates auth.uid() and its resource membership. Only signed-in users may
-- invoke them; anonymous access is explicitly removed.
revoke execute on function public.find_by_relay_number(text) from public, anon;
revoke execute on function public.accept_connection_request(uuid) from public, anon;
revoke execute on function public.get_or_create_direct_conversation(uuid) from public, anon;
revoke execute on function public.create_group(text, uuid[]) from public, anon;
revoke execute on function public.add_group_member(uuid, uuid) from public, anon;
revoke execute on function public.leave_group(uuid) from public, anon;
revoke execute on function public.create_plan(uuid, text, text, text, text[], text, date, date, date[]) from public, anon;
revoke execute on function public.submit_plan_response(uuid, uuid, text) from public, anon;
revoke execute on function public.delete_plan(uuid) from public, anon;

grant execute on function public.find_by_relay_number(text) to authenticated;
grant execute on function public.accept_connection_request(uuid) to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;
grant execute on function public.create_group(text, uuid[]) to authenticated;
grant execute on function public.add_group_member(uuid, uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.create_plan(uuid, text, text, text, text[], text, date, date, date[]) to authenticated;
grant execute on function public.submit_plan_response(uuid, uuid, text) to authenticated;
grant execute on function public.delete_plan(uuid) to authenticated;

-- With RLS enabled, the absence of write policies already denies direct
-- inserts/updates/deletes. This all-actions false policy also participated in
-- SELECT evaluation and produced unnecessary duplicate-policy work.
drop policy if exists "groups_no_direct_write" on public.groups;
