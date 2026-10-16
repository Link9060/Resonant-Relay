-- A saved assistant reply is the durable completion event. No client tab or AI call is required.
create or replace function private.notify_ravin_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role <> 'assistant' or nullif(btrim(new.content), '') is null then
    return new;
  end if;
  if auth.uid() is not null and auth.uid() <> new.user_id then
    raise exception 'RAVIN completion owner mismatch';
  end if;
  if not exists (select 1 from public.ravin_conversations c where c.id = new.conversation_id and c.user_id = new.user_id) then
    return new;
  end if;
  insert into public.notifications (id, user_id, type, title, body, link)
  values (new.id, new.user_id, 'system', 'RAVIN finished thinking',
    'Your response is ready. Open the conversation to continue.',
    '/ravin/?conversation_id=' || new.conversation_id::text)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.notify_ravin_completion() from public, anon, authenticated;
drop trigger if exists notify_ravin_completion on public.ravin_messages;
create trigger notify_ravin_completion after insert on public.ravin_messages
for each row execute function private.notify_ravin_completion();
