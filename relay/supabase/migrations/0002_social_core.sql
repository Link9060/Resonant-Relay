-- ============================================================================
-- RELAY — SOCIAL CORE PHASE SCHEMA
-- Direct messages, groups, and group messaging. Builds on 0001_foundation.sql
-- (profiles, connections). Run after that file, once, in the SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- GROUPS
-- A group is a reusable unit of people ("Friday Seminar squad", "MTB
-- friends") that both Chats and, later, Planner hang off of.
-- ----------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create type public.group_member_role as enum ('admin', 'member');

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.group_member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_idx on public.group_members (user_id);

-- ----------------------------------------------------------------------------
-- CONVERSATIONS
-- One row per thread — either a two-person "direct" thread or the chat
-- attached to a group. `direct_key` is a canonical, order-independent key
-- ("<smaller-uuid>:<larger-uuid>") used to guarantee exactly one direct
-- conversation ever exists per pair of people.
-- ----------------------------------------------------------------------------
create type public.conversation_type as enum ('direct', 'group');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null,
  group_id uuid unique references public.groups (id) on delete cascade,
  direct_key text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint direct_has_key check (
    (type = 'direct' and direct_key is not null and group_id is null) or
    (type = 'group' and group_id is not null and direct_key is null)
  )
);

create unique index conversations_direct_key_unique
  on public.conversations (direct_key)
  where type = 'direct';

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create index conversation_participants_user_idx on public.conversation_participants (user_id);

-- ----------------------------------------------------------------------------
-- MESSAGES
-- ----------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_on_message();

-- Required for the client's postgres_changes subscription (MessageThread) to
-- receive new-message events. RLS still applies to what each client actually
-- receives, so this doesn't widen access — it only enables the delivery
-- mechanism.
alter publication supabase_realtime add table public.messages;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Groups: visible to members; created/modified only through RPCs below.
create policy "groups_select_member"
  on public.groups for select
  using (exists (select 1 from public.group_members gm where gm.group_id = groups.id and gm.user_id = auth.uid()));

create policy "groups_no_direct_write"
  on public.groups for all
  using (false) with check (false);

-- Group members: visible to other members of the same group (self-referential
-- EXISTS so you can see the roster without being able to see other groups).
create policy "group_members_select_fellow_member"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
    )
  );

-- Leaving a group is a direct delete of your own row; joining/adding others
-- goes through the RPCs below (which also need to keep conversation
-- membership in sync, so they can't be plain inserts).
create policy "group_members_delete_self"
  on public.group_members for delete
  using (auth.uid() = user_id);

create policy "group_members_no_direct_insert"
  on public.group_members for insert
  with check (false);

-- Conversations: visible to participants only; created only via RPCs.
create policy "conversations_select_participant"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
    )
  );

create policy "conversations_no_direct_write"
  on public.conversations for insert
  with check (false);

-- Participants: visible to fellow participants of the same conversation.
create policy "participants_select_fellow_participant"
  on public.conversation_participants for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "participants_no_direct_insert"
  on public.conversation_participants for insert
  with check (false);

-- Leaving a group conversation is allowed directly; direct-message threads
-- have no "leave" concept in the MVP.
create policy "participants_delete_self"
  on public.conversation_participants for delete
  using (auth.uid() = user_id);

-- A participant can update their own last_read_at (for unread counts).
create policy "participants_update_own_read_state"
  on public.conversation_participants for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Messages: participants can read the thread and send as themselves.
create policy "messages_select_participant"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "messages_insert_as_participant"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "messages_delete_own"
  on public.messages for delete
  using (auth.uid() = sender_id);

-- ----------------------------------------------------------------------------
-- HELPER: are two users connected? (mirrors the canonical ordering used by
-- the `connections` table from the foundation migration)
-- ----------------------------------------------------------------------------
create or replace function public.are_connected(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.connections c
    where (c.user_a = least(p_user_a, p_user_b) and c.user_b = greatest(p_user_a, p_user_b))
  );
$$;

-- ----------------------------------------------------------------------------
-- RPC: get_or_create_direct_conversation
-- Direct messaging is restricted to Relay contacts — "these are my people,"
-- not an open inbox. Returns the existing thread if one already exists.
-- ----------------------------------------------------------------------------
create or replace function public.get_or_create_direct_conversation(p_other_user_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  key text;
  conv_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if auth.uid() = p_other_user_id then
    raise exception 'cannot start a conversation with yourself';
  end if;
  if not public.are_connected(auth.uid(), p_other_user_id) then
    raise exception 'you can only message people in your contacts';
  end if;

  key := least(auth.uid(), p_other_user_id)::text || ':' || greatest(auth.uid(), p_other_user_id)::text;

  select id into conv_id from public.conversations where direct_key = key;
  if conv_id is not null then
    return conv_id;
  end if;

  insert into public.conversations (type, direct_key) values ('direct', key)
  returning id into conv_id;

  insert into public.conversation_participants (conversation_id, user_id)
  values (conv_id, auth.uid()), (conv_id, p_other_user_id);

  return conv_id;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: create_group
-- Creates the group, makes the caller its admin, adds the given members
-- (must all be existing contacts of the caller), and creates the group's
-- conversation with everyone as a participant. Returns the conversation id
-- since that's what the UI navigates to.
-- ----------------------------------------------------------------------------
create or replace function public.create_group(p_name text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_group_id uuid;
  new_conversation_id uuid;
  member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'group name is required';
  end if;

  foreach member_id in array p_member_ids loop
    if member_id <> auth.uid() and not public.are_connected(auth.uid(), member_id) then
      raise exception 'you can only add people from your contacts';
    end if;
  end loop;

  insert into public.groups (name, created_by) values (trim(p_name), auth.uid())
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role) values (new_group_id, auth.uid(), 'admin');

  insert into public.conversations (type, group_id) values ('group', new_group_id)
  returning id into new_conversation_id;

  insert into public.conversation_participants (conversation_id, user_id) values (new_conversation_id, auth.uid());

  foreach member_id in array p_member_ids loop
    if member_id <> auth.uid() then
      insert into public.group_members (group_id, user_id, role) values (new_group_id, member_id, 'member')
        on conflict do nothing;
      insert into public.conversation_participants (conversation_id, user_id) values (new_conversation_id, member_id)
        on conflict do nothing;
    end if;
  end loop;

  return new_conversation_id;
end;
$$;

revoke all on function public.create_group(text, uuid[]) from public;
grant execute on function public.create_group(text, uuid[]) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: add_group_member
-- Admin-only. New member must be a contact of the admin doing the adding.
-- ----------------------------------------------------------------------------
create or replace function public.add_group_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  conv_id uuid;
begin
  if not exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'only a group admin can add members';
  end if;

  if not public.are_connected(auth.uid(), p_user_id) then
    raise exception 'you can only add people from your contacts';
  end if;

  select id into conv_id from public.conversations where group_id = p_group_id;

  insert into public.group_members (group_id, user_id, role) values (p_group_id, p_user_id, 'member')
    on conflict do nothing;
  insert into public.conversation_participants (conversation_id, user_id) values (conv_id, p_user_id)
    on conflict do nothing;
end;
$$;

revoke all on function public.add_group_member(uuid, uuid) from public;
grant execute on function public.add_group_member(uuid, uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- RPC: leave_group
-- Removes the caller from the group and its conversation. If they were the
-- last remaining member, the group and its messages are cleaned up.
-- ----------------------------------------------------------------------------
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  conv_id uuid;
  remaining int;
begin
  select id into conv_id from public.conversations where group_id = p_group_id;

  delete from public.group_members where group_id = p_group_id and user_id = auth.uid();
  delete from public.conversation_participants where conversation_id = conv_id and user_id = auth.uid();

  select count(*) into remaining from public.group_members where group_id = p_group_id;
  if remaining = 0 then
    delete from public.groups where id = p_group_id; -- cascades to conversations/messages
  end if;
end;
$$;

revoke all on function public.leave_group(uuid) from public;
grant execute on function public.leave_group(uuid) to authenticated;
