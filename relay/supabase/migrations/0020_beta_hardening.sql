-- RELAY — BETA HARDENING
-- Replies, reactions, personal message/chat controls, reporting, group admin,
-- search, and notification-aware conversation mutes.

set lock_timeout = '5s';
set statement_timeout = '60s';

alter table public.email_oauth_states add column if not exists return_path text not null default '/email';

-- Replies are immutable after send. A reply must point to another message in
-- the same conversation; the insert policy below enforces that relationship.
alter table public.messages add column if not exists reply_to_id uuid references public.messages(id) on delete set null;
revoke insert on public.messages from authenticated;
grant insert (conversation_id, sender_id, body, attachments, reply_to_id) on public.messages to authenticated;

drop policy if exists "messages_insert_as_participant" on public.messages;
create policy "messages_insert_as_participant"
on public.messages for insert to authenticated
with check (
  (select auth.uid()) = sender_id
  and private.can_access_conversation(conversation_id, (select auth.uid()))
  and (
    reply_to_id is null
    or exists (
      select 1 from public.messages replied
      where replied.id = messages.reply_to_id
        and replied.conversation_id = messages.conversation_id
    )
  )
);

-- Hard deletion is performed only by the account-center Edge Function after
-- it removes Storage objects. This prevents orphaned uploads.
drop policy if exists "messages_delete_own" on public.messages;
revoke delete on public.messages from authenticated, anon;

create table if not exists public.hidden_messages (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  hidden_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.hidden_messages enable row level security;
revoke all on public.hidden_messages from anon;
grant select, insert, delete on public.hidden_messages to authenticated;
create policy "hidden_messages_own"
on public.hidden_messages for all to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.messages m
    where m.id = hidden_messages.message_id
      and private.can_access_conversation(m.conversation_id, (select auth.uid()))
  )
);

create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👍','❤️','😂','‼️','❓','🎉')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists message_reactions_message_idx on public.message_reactions(message_id, created_at);
alter table public.message_reactions enable row level security;
revoke all on public.message_reactions from anon;
grant select, insert, delete on public.message_reactions to authenticated;
create policy "message_reactions_read_participant"
on public.message_reactions for select to authenticated
using (exists (
  select 1 from public.messages m
  where m.id = message_reactions.message_id
    and private.can_access_conversation(m.conversation_id, (select auth.uid()))
));
create policy "message_reactions_add_own"
on public.message_reactions for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.messages m
    where m.id = message_reactions.message_id
      and private.can_access_conversation(m.conversation_id, (select auth.uid()))
  )
);
create policy "message_reactions_remove_own"
on public.message_reactions for delete to authenticated
using ((select auth.uid()) = user_id);

create table if not exists public.message_pins (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pinned_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.message_pins enable row level security;
revoke all on public.message_pins from anon;
grant select, insert, delete on public.message_pins to authenticated;
create policy "message_pins_own"
on public.message_pins for all to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.messages m
    where m.id = message_pins.message_id
      and private.can_access_conversation(m.conversation_id, (select auth.uid()))
  )
);

create table if not exists public.conversation_preferences (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  muted boolean not null default false,
  pinned_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists conversation_preferences_user_pin_idx on public.conversation_preferences(user_id, pinned_at desc);
alter table public.conversation_preferences enable row level security;
revoke all on public.conversation_preferences from anon;
grant select, insert, update, delete on public.conversation_preferences to authenticated;
create policy "conversation_preferences_own"
on public.conversation_preferences for all to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and private.can_access_conversation(conversation_id, (select auth.uid()))
);

-- Reports are written only through submit_report. Reported people cannot read
-- the report; reporters can see the status of reports they submitted.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  reason text not null check (reason in ('spam','account','inappropriate_message','harassment','other')),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'submitted' check (status in ('submitted','reviewing','resolved','dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists reports_status_created_idx on public.reports(status, created_at);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select on public.reports to authenticated;
create policy "reports_read_own"
on public.reports for select to authenticated
using ((select auth.uid()) = reporter_id);

create or replace function public.submit_report(
  p_reason text,
  p_message_id uuid default null,
  p_reported_user_id uuid default null,
  p_details text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
  report_id uuid;
  target_user uuid := p_reported_user_id;
  target_conversation uuid;
begin
  if caller is null then raise exception 'not authenticated'; end if;
  if p_reason not in ('spam','account','inappropriate_message','harassment','other') then raise exception 'invalid report reason'; end if;
  if p_details is not null and char_length(trim(p_details)) > 500 then raise exception 'report details are too long'; end if;
  if (select count(*) from public.reports where reporter_id = caller and created_at > now() - interval '1 day') >= 20 then
    raise exception 'report limit reached';
  end if;

  if p_message_id is not null then
    select sender_id, conversation_id into target_user, target_conversation
    from public.messages where id = p_message_id;
    if target_conversation is null or not private.can_access_conversation(target_conversation, caller) then
      raise exception 'message unavailable';
    end if;
  elsif target_user is not null then
    if not exists (
      select 1
      from public.conversation_participants mine
      join public.conversation_participants theirs using (conversation_id)
      where mine.user_id = caller and theirs.user_id = target_user
    ) and not public.are_connected(caller, target_user) then
      raise exception 'account unavailable';
    end if;
  else
    raise exception 'choose a message or account to report';
  end if;

  if target_user = caller then raise exception 'you cannot report yourself'; end if;
  insert into public.reports(reporter_id, reported_user_id, message_id, reason, details)
  values (caller, target_user, p_message_id, p_reason, nullif(trim(p_details), ''))
  returning id into report_id;
  return report_id;
end;
$$;
revoke all on function public.submit_report(text, uuid, uuid, text) from public, anon;
grant execute on function public.submit_report(text, uuid, uuid, text) to authenticated;

-- Personal full-text-lite search across visible messages and attachment names.
create or replace function public.search_my_messages(p_query text)
returns table (
  message_id uuid,
  conversation_id uuid,
  sender_id uuid,
  body text,
  attachment_names text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.conversation_id, m.sender_id, m.body,
    coalesce((select string_agg(item->>'name', ' · ') from jsonb_array_elements(m.attachments) item), ''),
    m.created_at
  from public.messages m
  where (select auth.uid()) is not null
    and char_length(trim(p_query)) >= 2
    and private.can_access_conversation(m.conversation_id, (select auth.uid()))
    and not exists (select 1 from public.hidden_messages h where h.message_id = m.id and h.user_id = (select auth.uid()))
    and (
      m.body ilike '%' || replace(replace(trim(p_query), '%', '\%'), '_', '\_') || '%' escape '\'
      or exists (
        select 1 from jsonb_array_elements(m.attachments) item
        where item->>'name' ilike '%' || replace(replace(trim(p_query), '%', '\%'), '_', '\_') || '%' escape '\'
      )
    )
  order by m.created_at desc
  limit 50;
$$;
revoke all on function public.search_my_messages(text) from public, anon;
grant execute on function public.search_my_messages(text) to authenticated;

create or replace function public.rename_group(p_group_id uuid, p_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = (select auth.uid()) and role = 'admin') then raise exception 'only an admin can rename this group'; end if;
  if char_length(trim(p_name)) not between 1 and 80 then raise exception 'group names must be 1 to 80 characters'; end if;
  update public.groups set name = trim(p_name) where id = p_group_id;
end;
$$;

create or replace function public.promote_group_member(p_group_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = (select auth.uid()) and role = 'admin') then raise exception 'only an admin can promote members'; end if;
  update public.group_members set role = 'admin' where group_id = p_group_id and user_id = p_user_id;
  if not found then raise exception 'member not found'; end if;
end;
$$;

create or replace function public.remove_group_member(p_group_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare conv_id uuid;
begin
  if p_user_id = (select auth.uid()) then raise exception 'use leave group for yourself'; end if;
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = (select auth.uid()) and role = 'admin') then raise exception 'only an admin can remove members'; end if;
  select id into conv_id from public.conversations where group_id = p_group_id;
  delete from public.group_members where group_id = p_group_id and user_id = p_user_id;
  if not found then raise exception 'member not found'; end if;
  delete from public.conversation_participants where conversation_id = conv_id and user_id = p_user_id;
end;
$$;

revoke all on function public.rename_group(uuid, text) from public, anon;
revoke all on function public.promote_group_member(uuid, uuid) from public, anon;
revoke all on function public.remove_group_member(uuid, uuid) from public, anon;
grant execute on function public.rename_group(uuid, text) to authenticated;
grant execute on function public.promote_group_member(uuid, uuid) to authenticated;
grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

-- Muted conversations do not create in-app or native-push notifications.
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = 'public' as $$
declare sender_name text; conversation_row record; group_name text; notification_title text; notification_body text; preview text;
begin
  select display_name into sender_name from public.profiles where id = new.sender_id;
  select * into conversation_row from public.conversations where id = new.conversation_id;
  if conversation_row.type = 'group' then select name into group_name from public.groups where id = conversation_row.group_id; end if;
  preview := case when char_length(new.body) > 0 then left(new.body,80) when jsonb_array_length(new.attachments) = 1 then 'Sent an attachment' else 'Sent attachments' end;
  notification_title := case when conversation_row.type = 'group' then coalesce(group_name,'Group') else coalesce(sender_name,'Someone') end;
  notification_body := case when conversation_row.type = 'group' then coalesce(sender_name,'Someone') || ': ' || preview else preview end;
  insert into public.notifications(user_id,type,title,body,link)
  select cp.user_id,'new_message',notification_title,notification_body,'/chats/' || new.conversation_id::text
  from public.conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id
    and not exists (
      select 1 from public.conversation_preferences pref
      where pref.conversation_id = new.conversation_id and pref.user_id = cp.user_id and pref.muted
    );
  return new;
end;
$$;

-- Realtime tables (idempotent publication registration).
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_reactions') then alter publication supabase_realtime add table public.message_reactions; end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'message_pins') then alter publication supabase_realtime add table public.message_pins; end if;
end $$;

notify pgrst, 'reload schema';
