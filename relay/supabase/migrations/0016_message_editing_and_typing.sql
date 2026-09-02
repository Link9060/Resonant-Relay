-- RELAY — MESSAGE EDITING AND PRIVATE TYPING SIGNALS

-- Editing follows the familiar 15-minute window. Only the message body is
-- writable from the browser; sender, conversation, timestamps, and ids stay
-- protected even if someone bypasses the interface.
revoke update on public.messages from authenticated;
grant update (body) on public.messages to authenticated;

drop policy if exists "messages_update_own_recent" on public.messages;
create policy "messages_update_own_recent"
  on public.messages for update to authenticated
  using (
    (select auth.uid()) = sender_id
    and created_at >= now() - interval '15 minutes'
    and (select private.can_access_conversation(conversation_id, (select auth.uid())))
  )
  with check (
    (select auth.uid()) = sender_id
    and created_at >= now() - interval '15 minutes'
    and (select private.can_access_conversation(conversation_id, (select auth.uid())))
  );

create or replace function private.mark_message_edited()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.edited_at := now();
  return new;
end;
$$;

revoke all on function private.mark_message_edited() from public, anon, authenticated;

drop trigger if exists messages_mark_edited on public.messages;
create trigger messages_mark_edited
  before update of body on public.messages
  for each row execute function private.mark_message_edited();

-- Typing events are ephemeral Realtime Broadcasts. A signed-in user can only
-- send or receive them for conversations they currently belong to.
drop policy if exists "conversation_typing_receive" on realtime.messages;
create policy "conversation_typing_receive"
  on realtime.messages for select to authenticated
  using (
    extension = 'broadcast'
    and case
      when (select realtime.topic()) ~ '^typing:[0-9a-fA-F-]{36}$' then exists (
        select 1
        from public.conversation_participants participant
        where participant.conversation_id = split_part((select realtime.topic()), ':', 2)::uuid
          and participant.user_id = (select auth.uid())
      )
      else false
    end
  );

drop policy if exists "conversation_typing_send" on realtime.messages;
create policy "conversation_typing_send"
  on realtime.messages for insert to authenticated
  with check (
    extension = 'broadcast'
    and case
      when (select realtime.topic()) ~ '^typing:[0-9a-fA-F-]{36}$' then exists (
        select 1
        from public.conversation_participants participant
        where participant.conversation_id = split_part((select realtime.topic()), ':', 2)::uuid
          and participant.user_id = (select auth.uid())
      )
      else false
    end
  );

notify pgrst, 'reload schema';
