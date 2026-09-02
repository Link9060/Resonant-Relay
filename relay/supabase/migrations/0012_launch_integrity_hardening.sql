-- RELAY — LAUNCH INTEGRITY HARDENING
-- Forward-only migration. Apply after 0011. This file intentionally does not
-- rewrite any already-applied migration.

-- Requests are managed only by operation-specific RPCs. The existing broad
-- UPDATE policy and authenticated grant are removed so IDs/status cannot be
-- forged through the Data API.
drop policy if exists "requests_update_participant" on public.connection_requests;
revoke insert, update on public.connection_requests from authenticated;
revoke insert on public.connection_requests from anon;

create or replace function public.send_connection_request(p_recipient_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
  recent_requests int;
  reverse_pending boolean;
begin
  if caller is null then raise exception 'not authenticated'; end if;
  if p_recipient_id is null or p_recipient_id = caller then raise exception 'invalid recipient'; end if;
  if not exists (select 1 from public.profiles where id = p_recipient_id) then raise exception 'recipient unavailable'; end if;
  if public.are_connected(caller, p_recipient_id) then raise exception 'already connected'; end if;
  if exists (select 1 from public.connection_requests where sender_id = caller and recipient_id = p_recipient_id and status = 'pending') then raise exception 'request already pending'; end if;
  select exists (select 1 from public.connection_requests where sender_id = p_recipient_id and recipient_id = caller and status = 'pending') into reverse_pending;
  if reverse_pending then raise exception 'this person already requested to connect'; end if;
  select count(*) into recent_requests from public.connection_requests
    where sender_id = caller and created_at > now() - interval '10 minutes';
  if recent_requests >= 10 then raise exception 'too many requests — please wait a few minutes and try again'; end if;
  insert into public.connection_requests (sender_id, recipient_id) values (caller, p_recipient_id);
end;
$$;

revoke all on function public.send_connection_request(uuid) from public, anon;
grant execute on function public.send_connection_request(uuid) to authenticated;

create or replace function public.accept_connection_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  req public.connection_requests%rowtype;
  a uuid;
  b uuid;
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  select * into req from public.connection_requests where id = p_request_id for update;
  if not found then raise exception 'request not found'; end if;
  if req.recipient_id <> (select auth.uid()) then raise exception 'only the recipient can accept this request'; end if;
  if req.status <> 'pending' then raise exception 'request is no longer pending'; end if;
  update public.connection_requests set status = 'accepted', responded_at = now() where id = req.id;
  a := least(req.sender_id, req.recipient_id);
  b := greatest(req.sender_id, req.recipient_id);
  insert into public.connections (user_a, user_b) values (a, b) on conflict (user_a, user_b) do nothing;
end;
$$;

create or replace function public.decline_connection_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  update public.connection_requests
    set status = 'declined', responded_at = now()
    where id = p_request_id
      and recipient_id = (select auth.uid())
      and status = 'pending';
  if not found then raise exception 'request is unavailable'; end if;
end;
$$;

create or replace function public.cancel_connection_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  update public.connection_requests
    set status = 'canceled', responded_at = now()
    where id = p_request_id
      and sender_id = (select auth.uid())
      and status = 'pending';
  if not found then raise exception 'request is unavailable'; end if;
end;
$$;

revoke all on function public.accept_connection_request(uuid) from public, anon;
revoke all on function public.decline_connection_request(uuid) from public, anon;
revoke all on function public.cancel_connection_request(uuid) from public, anon;
grant execute on function public.accept_connection_request(uuid) to authenticated;
grant execute on function public.decline_connection_request(uuid) to authenticated;
grant execute on function public.cancel_connection_request(uuid) to authenticated;

-- The two group membership tables represent one logical membership. Remove
-- independent client deletes; leave_group is the sole client operation.
revoke delete on public.group_members, public.conversation_participants from authenticated;
drop policy if exists "group_members_delete_self" on public.group_members;
drop policy if exists "participants_delete_self" on public.conversation_participants;

create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
  conv_id uuid;
  remaining_admins int;
  remaining_members int;
  replacement uuid;
begin
  if caller is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = caller) then
    raise exception 'you are not a member of this group';
  end if;
  select id into conv_id from public.conversations where group_id = p_group_id for update;
  select count(*) filter (where role = 'admin'), count(*) into remaining_admins, remaining_members
    from public.group_members where group_id = p_group_id and user_id <> caller;
  if remaining_members > 0 and remaining_admins = 0 then
    select user_id into replacement from public.group_members
      where group_id = p_group_id and user_id <> caller order by joined_at, user_id limit 1;
    update public.group_members set role = 'admin' where group_id = p_group_id and user_id = replacement;
  end if;
  delete from public.group_members where group_id = p_group_id and user_id = caller;
  if conv_id is not null then
    delete from public.conversation_participants where conversation_id = conv_id and user_id = caller;
  end if;
  if remaining_members = 0 then delete from public.groups where id = p_group_id; end if;
end;
$$;

revoke all on function public.leave_group(uuid) from public, anon;
grant execute on function public.leave_group(uuid) to authenticated;

-- Messages retain database-authoritative length validation. Direct inserts are
-- still participant-scoped, while a dedicated RPC can be added once the
-- product's desired burst/rolling limits are owner-approved.
