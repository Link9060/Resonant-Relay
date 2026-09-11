-- RELAY — STABILITY PASS
-- Friend request lifecycle, realtime contact refresh, and safe RPC grants.

do $$
begin
  begin
    alter publication supabase_realtime add table public.connection_requests;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.connections;
  exception when duplicate_object then null;
  end;
end;
$$;

create or replace function public.decline_connection_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  caller uuid := (select auth.uid());
  req public.connection_requests%rowtype;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  select * into req
  from public.connection_requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'request not found';
  end if;
  if req.recipient_id <> caller then
    raise exception 'only the recipient can decline this request';
  end if;
  if req.status <> 'pending' then
    raise exception 'request is no longer pending';
  end if;

  update public.connection_requests
  set status = 'declined', responded_at = now()
  where id = p_request_id;
end;
$$;

create or replace function public.cancel_connection_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  caller uuid := (select auth.uid());
  req public.connection_requests%rowtype;
begin
  if caller is null then
    raise exception 'not authenticated';
  end if;

  select * into req
  from public.connection_requests
  where id = p_request_id
  for update;

  if req.id is null then
    raise exception 'request not found';
  end if;
  if req.sender_id <> caller then
    raise exception 'only the sender can cancel this request';
  end if;
  if req.status <> 'pending' then
    raise exception 'request is no longer pending';
  end if;

  update public.connection_requests
  set status = 'cancelled', responded_at = now()
  where id = p_request_id;
end;
$$;

revoke all on function public.decline_connection_request(uuid) from public;
revoke all on function public.cancel_connection_request(uuid) from public;
grant execute on function public.decline_connection_request(uuid) to authenticated;
grant execute on function public.cancel_connection_request(uuid) to authenticated;
