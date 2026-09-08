-- RELAY — SAFE CONVERSATION SEND STATUS
-- Lets the current participant know whether a conversation can accept a new
-- message without exposing another user's private relationship state.

create or replace function public.conversation_send_status(p_conversation_id uuid)
returns table (
  can_send boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
  v_type public.conversation_type;
begin
  if caller is null then raise exception 'not authenticated'; end if;

  select c.type into v_type
  from public.conversations c
  join public.conversation_participants cp
    on cp.conversation_id = c.id and cp.user_id = caller
  where c.id = p_conversation_id;

  if not found then raise exception 'conversation unavailable'; end if;

  if private.can_send_to_conversation(p_conversation_id, caller) then
    return query select true, null::text;
    return;
  end if;

  if v_type = 'direct' then
    return query select false, 'Reconnect in Contacts to send new messages.'::text;
  else
    return query select false, 'You can no longer send messages in this conversation.'::text;
  end if;
end;
$$;

revoke all on function public.conversation_send_status(uuid) from public, anon;
grant execute on function public.conversation_send_status(uuid) to authenticated;
