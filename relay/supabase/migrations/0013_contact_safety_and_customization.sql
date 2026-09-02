-- RELAY — CONTACT SAFETY AND CUSTOMIZATION
-- Forward-only migration. Adds editable bios, private contact appearance
-- preferences, and database-enforced blocking.

alter table public.profiles add column if not exists bio text;

alter table public.profiles
  add constraint profiles_display_name_length check (char_length(trim(display_name)) between 1 and 40) not valid,
  add constraint profiles_school_length check (school is null or char_length(school) <= 80) not valid,
  add constraint profiles_bio_length check (bio is null or char_length(bio) <= 160) not valid,
  add constraint profiles_avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 500) not valid;

alter table public.profiles validate constraint profiles_display_name_length;
alter table public.profiles validate constraint profiles_school_length;
alter table public.profiles validate constraint profiles_bio_length;
alter table public.profiles validate constraint profiles_avatar_url_length;

revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url, school, bio) on public.profiles to authenticated;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create table public.contact_preferences (
  owner_id uuid not null references public.profiles (id) on delete cascade,
  contact_id uuid not null references public.profiles (id) on delete cascade,
  nickname text,
  color_key text not null default 'slate',
  updated_at timestamptz not null default now(),
  primary key (owner_id, contact_id),
  constraint contact_preferences_not_self check (owner_id <> contact_id),
  constraint contact_preferences_nickname_length check (nickname is null or char_length(nickname) between 1 and 32),
  constraint contact_preferences_color check (color_key in ('slate','blue','violet','rose','orange','green','cyan','pink'))
);

create index contact_preferences_contact_idx on public.contact_preferences (contact_id);
create trigger contact_preferences_set_updated_at
  before update on public.contact_preferences
  for each row execute function public.set_updated_at();

alter table public.contact_preferences enable row level security;
grant select, insert, update, delete on public.contact_preferences to authenticated;

create policy "contact_preferences_select_own"
  on public.contact_preferences for select to authenticated
  using ((select auth.uid()) = owner_id);
create policy "contact_preferences_insert_own_contact"
  on public.contact_preferences for insert to authenticated
  with check ((select auth.uid()) = owner_id and public.are_connected(owner_id, contact_id));
create policy "contact_preferences_update_own_contact"
  on public.contact_preferences for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id and public.are_connected(owner_id, contact_id));
create policy "contact_preferences_delete_own"
  on public.contact_preferences for delete to authenticated
  using ((select auth.uid()) = owner_id);

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_not_self check (blocker_id <> blocked_id)
);

create index user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
grant select on public.user_blocks to authenticated;
create policy "user_blocks_select_own"
  on public.user_blocks for select to authenticated
  using ((select auth.uid()) = blocker_id);

create or replace function private.is_blocked_between(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
$$;

create or replace function private.can_access_conversation(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    join public.conversation_participants mine
      on mine.conversation_id = c.id and mine.user_id = p_user_id
    where c.id = p_conversation_id
      and (
        c.type = 'group'
        or not exists (
          select 1 from public.conversation_participants other
          where other.conversation_id = c.id
            and other.user_id <> p_user_id
            and private.is_blocked_between(p_user_id, other.user_id)
        )
      )
  );
$$;

revoke all on function private.is_blocked_between(uuid, uuid) from public, anon;
revoke all on function private.can_access_conversation(uuid, uuid) from public, anon;
grant execute on function private.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function private.can_access_conversation(uuid, uuid) to authenticated;

create or replace function public.block_user(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then raise exception 'not authenticated'; end if;
  if p_blocked_id is null or p_blocked_id = caller then raise exception 'invalid user'; end if;
  if not exists (select 1 from public.profiles where id = p_blocked_id) then raise exception 'user unavailable'; end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (caller, p_blocked_id)
  on conflict do nothing;

  delete from public.connections
  where user_a = least(caller, p_blocked_id)
    and user_b = greatest(caller, p_blocked_id);

  update public.connection_requests
  set status = 'canceled', responded_at = now()
  where status = 'pending'
    and ((sender_id = caller and recipient_id = p_blocked_id)
      or (sender_id = p_blocked_id and recipient_id = caller));

  delete from public.contact_preferences
  where owner_id = caller and contact_id = p_blocked_id;
end;
$$;

create or replace function public.unblock_user(p_blocked_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.uid()) is null then raise exception 'not authenticated'; end if;
  delete from public.user_blocks
  where blocker_id = (select auth.uid()) and blocked_id = p_blocked_id;
end;
$$;

revoke all on function public.block_user(uuid) from public, anon;
revoke all on function public.unblock_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;

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
  if private.is_blocked_between(caller, p_recipient_id) then raise exception 'recipient unavailable'; end if;
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

create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
  key text;
  conv_id uuid;
begin
  if caller is null then raise exception 'not authenticated'; end if;
  if caller = p_other_user_id then raise exception 'cannot start a conversation with yourself'; end if;
  if private.is_blocked_between(caller, p_other_user_id) then raise exception 'contact unavailable'; end if;
  if not public.are_connected(caller, p_other_user_id) then raise exception 'you can only message people in your contacts'; end if;
  key := least(caller, p_other_user_id)::text || ':' || greatest(caller, p_other_user_id)::text;
  select id into conv_id from public.conversations where direct_key = key;
  if conv_id is not null then return conv_id; end if;
  insert into public.conversations (type, direct_key) values ('direct', key) returning id into conv_id;
  insert into public.conversation_participants (conversation_id, user_id)
  values (conv_id, caller), (conv_id, p_other_user_id);
  return conv_id;
end;
$$;

revoke all on function public.send_connection_request(uuid) from public, anon;
revoke all on function public.get_or_create_direct_conversation(uuid) from public, anon;
grant execute on function public.send_connection_request(uuid) to authenticated;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant"
  on public.conversations for select to authenticated
  using ((select private.can_access_conversation(id, (select auth.uid()))));

drop policy if exists "participants_select_fellow_participant" on public.conversation_participants;
create policy "participants_select_fellow_participant"
  on public.conversation_participants for select to authenticated
  using ((select private.can_access_conversation(conversation_id, (select auth.uid()))));

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
  on public.messages for select to authenticated
  using (
    (select private.can_access_conversation(conversation_id, (select auth.uid())))
    and not (select private.is_blocked_between((select auth.uid()), sender_id))
  );

drop policy if exists "messages_insert_as_participant" on public.messages;
create policy "messages_insert_as_participant"
  on public.messages for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and (select private.can_access_conversation(conversation_id, (select auth.uid())))
  );
