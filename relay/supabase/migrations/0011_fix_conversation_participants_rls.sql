-- Break the recursive conversation-participant policy while preserving the
-- rule that only members of a conversation may read its participant list.
create or replace function private.is_conversation_participant(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = target_conversation_id
      and cp.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_conversation_participant(uuid) from public, anon;
grant execute on function private.is_conversation_participant(uuid) to authenticated;

drop policy if exists "participants_select_fellow_participant" on public.conversation_participants;
create policy "participants_select_fellow_participant"
  on public.conversation_participants
  for select
  to authenticated
  using ((select private.is_conversation_participant(conversation_id)));

drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant"
  on public.conversations
  for select
  to authenticated
  using ((select private.is_conversation_participant(id)));

