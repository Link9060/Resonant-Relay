-- RELAY — CONTACT MANAGEMENT + OWNER ACCOUNT INSPECTOR
-- Adds non-blocking contact removal, blocked-people listing, relationship
-- history, owner-only notes/account inspection, storage attribution, and
-- read-only direct-message behavior after a contact is removed.

-- ---------------------------------------------------------------------------
-- RELATIONSHIP HISTORY (forward-looking only)
-- ---------------------------------------------------------------------------
create table if not exists public.relationship_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  other_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'contact_added','contact_removed','blocked_user','blocked_by_user',
    'unblocked_user','unblocked_by_user'
  )),
  actor_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists relationship_events_user_time_idx
  on public.relationship_events(user_id, created_at desc);

alter table public.relationship_events enable row level security;
revoke all on public.relationship_events from public, anon, authenticated;

create or replace function private.log_connection_relationship_event()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
  v_type text;
begin
  if tg_op = 'INSERT' then
    v_type := 'contact_added';
    insert into public.relationship_events(user_id, other_user_id, event_type, actor_id)
    values
      (new.user_a, new.user_b, v_type, v_actor),
      (new.user_b, new.user_a, v_type, v_actor);
    return new;
  end if;

  v_type := 'contact_removed';
  insert into public.relationship_events(user_id, other_user_id, event_type, actor_id)
  values
    (old.user_a, old.user_b, v_type, v_actor),
    (old.user_b, old.user_a, v_type, v_actor);
  return old;
end;
$$;

create or replace function private.log_block_relationship_event()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_actor uuid := (select auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.relationship_events(user_id, other_user_id, event_type, actor_id)
    values
      (new.blocker_id, new.blocked_id, 'blocked_user', v_actor),
      (new.blocked_id, new.blocker_id, 'blocked_by_user', v_actor);
    return new;
  end if;

  insert into public.relationship_events(user_id, other_user_id, event_type, actor_id)
  values
    (old.blocker_id, old.blocked_id, 'unblocked_user', v_actor),
    (old.blocked_id, old.blocker_id, 'unblocked_by_user', v_actor);
  return old;
end;
$$;

drop trigger if exists relationship_events_connections on public.connections;
create trigger relationship_events_connections
  after insert or delete on public.connections
  for each row execute function private.log_connection_relationship_event();

drop trigger if exists relationship_events_blocks on public.user_blocks;
create trigger relationship_events_blocks
  after insert or delete on public.user_blocks
  for each row execute function private.log_block_relationship_event();

-- ---------------------------------------------------------------------------
-- REMOVE CONTACT WITHOUT BLOCKING
-- Keeps old direct-message history and shared groups. Existing direct threads
-- become read-only until the users reconnect.
-- ---------------------------------------------------------------------------
create or replace function public.remove_contact(p_contact_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then raise exception 'not authenticated'; end if;
  if p_contact_id is null or p_contact_id = caller then raise exception 'invalid contact'; end if;

  if not public.are_connected(caller, p_contact_id) then
    raise exception 'contact not found';
  end if;

  delete from public.connections
  where user_a = least(caller, p_contact_id)
    and user_b = greatest(caller, p_contact_id);

  delete from public.contact_preferences
  where (owner_id = caller and contact_id = p_contact_id)
     or (owner_id = p_contact_id and contact_id = caller);

  update public.connection_requests
  set status = 'canceled', responded_at = now()
  where status = 'pending'
    and ((sender_id = caller and recipient_id = p_contact_id)
      or (sender_id = p_contact_id and recipient_id = caller));
end;
$$;

create or replace function public.list_blocked_people()
returns table (
  id uuid,
  display_name text,
  avatar_url text,
  school text,
  blocked_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then raise exception 'not authenticated'; end if;

  return query
  select p.id, p.display_name, p.avatar_url, p.school, b.created_at
  from public.user_blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = caller
  order by b.created_at desc;
end;
$$;

-- A direct conversation may remain readable after a contact is removed, but
-- sending new messages requires the two users to still be contacts.
create or replace function private.can_send_to_conversation(
  p_conversation_id uuid,
  p_user_id uuid
)
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
        or exists (
          select 1
          from public.conversation_participants other
          where other.conversation_id = c.id
            and other.user_id <> p_user_id
            and public.are_connected(p_user_id, other.user_id)
            and not private.is_blocked_between(p_user_id, other.user_id)
        )
      )
  );
$$;

revoke all on function private.can_send_to_conversation(uuid, uuid) from public, anon, authenticated;

drop policy if exists "messages_insert_as_participant" on public.messages;
create policy "messages_insert_as_participant"
  on public.messages for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and (select private.can_send_to_conversation(conversation_id, (select auth.uid())))
  );

revoke all on function public.remove_contact(uuid) from public, anon;
revoke all on function public.list_blocked_people() from public, anon;
grant execute on function public.remove_contact(uuid) to authenticated;
grant execute on function public.list_blocked_people() to authenticated;

-- ---------------------------------------------------------------------------
-- OWNER-ONLY NOTES
-- ---------------------------------------------------------------------------
create table if not exists public.owner_user_notes (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  note text not null check (char_length(trim(note)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists owner_user_notes_target_time_idx
  on public.owner_user_notes(target_user_id, created_at desc);

alter table public.owner_user_notes enable row level security;
revoke all on public.owner_user_notes from public, anon, authenticated;

create or replace function public.owner_add_user_note(p_user_id uuid, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_note text := trim(coalesce(p_note, ''));
begin
  if not public.has_staff_role('owner') then raise exception 'owner permission required'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'user not found'; end if;
  if char_length(v_note) < 1 or char_length(v_note) > 1000 then raise exception 'note must be between 1 and 1000 characters'; end if;

  insert into public.owner_user_notes(target_user_id, created_by, note)
  values (p_user_id, auth.uid(), v_note)
  returning id into v_id;

  insert into public.admin_audit_log(actor_id, action, target_user_id, metadata)
  values (auth.uid(), 'add_owner_user_note', p_user_id, jsonb_build_object('note_id', v_id));

  return v_id;
end;
$$;

create or replace function public.owner_delete_user_note(p_note_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target uuid;
begin
  if not public.has_staff_role('owner') then raise exception 'owner permission required'; end if;

  select target_user_id into v_target
  from public.owner_user_notes
  where id = p_note_id;

  if not found then raise exception 'note not found'; end if;

  delete from public.owner_user_notes where id = p_note_id;

  insert into public.admin_audit_log(actor_id, action, target_user_id, metadata)
  values (auth.uid(), 'delete_owner_user_note', v_target, jsonb_build_object('note_id', p_note_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- OWNER STORAGE ATTRIBUTION HELPERS
-- Database bytes are an estimate based on row payload sizes attributable to a
-- user. File bytes come from Supabase Storage object metadata and are exact
-- when Storage provides the object size metadata.
-- ---------------------------------------------------------------------------
create or replace function private.user_database_bytes(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select
      coalesce((select sum(pg_column_size(p)) from public.profiles p where p.id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(m)) from public.messages m where m.sender_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(c)) from public.connections c where c.user_a = p_user_id or c.user_b = p_user_id), 0)
    + coalesce((select sum(pg_column_size(r)) from public.connection_requests r where r.sender_id = p_user_id or r.recipient_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(cp)) from public.contact_preferences cp where cp.owner_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(ub)) from public.user_blocks ub where ub.blocker_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(gm)) from public.group_members gm where gm.user_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(cpa)) from public.conversation_participants cpa where cpa.user_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(t)) from public.todos t where t.user_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(n)) from public.notifications n where n.user_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(rp)) from public.reports rp where rp.reporter_id = p_user_id or rp.reported_user_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(sr)) from public.staff_requests sr where sr.requester_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(pr)) from public.plan_responses pr where pr.user_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(g)) from public.groups g where g.created_by = p_user_id), 0)
    + coalesce((select sum(pg_column_size(pl)) from public.plans pl where pl.created_by = p_user_id), 0)
    + coalesce((select sum(pg_column_size(a)) from public.admin_audit_log a where a.actor_id = p_user_id or a.target_user_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(re)) from public.relationship_events re where re.user_id = p_user_id), 0)
    + coalesce((select sum(pg_column_size(oun)) from public.owner_user_notes oun where oun.target_user_id = p_user_id), 0);
$$;

create or replace function private.user_file_bytes(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(
    case
      when coalesce(o.metadata->>'size','') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint
      else 0
    end
  ), 0)
  from storage.objects o
  where o.owner = p_user_id or o.owner_id = p_user_id::text;
$$;

revoke all on function private.user_database_bytes(uuid) from public, anon, authenticated;
revoke all on function private.user_file_bytes(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- OWNER DEEP ACCOUNT INSPECTOR
-- Deliberately returns conversation metadata, not private message bodies.
-- Reported-message content remains available through the existing moderation
-- workflow, where access has a clear safety/moderation context.
-- ---------------------------------------------------------------------------
create or replace function public.owner_user_inspector(p_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, auth, storage, pg_temp
as $$
declare
  v_result jsonb;
  v_average_user_bytes bigint;
begin
  if not public.has_staff_role('owner') then raise exception 'owner permission required'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'user not found'; end if;

  select coalesce(avg(private.user_database_bytes(p.id) + private.user_file_bytes(p.id))::bigint, 0)
  into v_average_user_bytes
  from public.profiles p;

  select jsonb_build_object(
    'overview', jsonb_build_object(
      'id', p.id,
      'display_name', p.display_name,
      'relay_number', p.relay_number,
      'school', p.school,
      'bio', p.bio,
      'role', p.role,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'primary_email', u.email,
      'last_sign_in_at', u.last_sign_in_at,
      'banned_at', p.banned_at,
      'ban_reason', p.ban_reason,
      'message_count', (select count(*) from public.messages m where m.sender_id = p.id),
      'contact_count', (select count(*) from public.connections c where c.user_a = p.id or c.user_b = p.id),
      'group_count', (select count(*) from public.group_members gm where gm.user_id = p.id),
      'conversation_count', (select count(*) from public.conversation_participants cp where cp.user_id = p.id),
      'report_count', (select count(*) from public.reports r where r.reported_user_id = p.id),
      'open_report_count', (select count(*) from public.reports r where r.reported_user_id = p.id and r.status in ('submitted','reviewing')),
      'reports_submitted', (select count(*) from public.reports r where r.reporter_id = p.id),
      'todo_count', (select count(*) from public.todos t where t.user_id = p.id),
      'gmail_connected', exists(select 1 from public.google_integrations gi where gi.user_id = p.id and gi.service = 'gmail'),
      'calendar_connected', exists(select 1 from public.google_integrations gi where gi.user_id = p.id and gi.service = 'calendar'),
      'email_accounts', (select count(*) from public.email_integrations ei where ei.user_id = p.id),
      'privacy_requests', (select count(*) from public.staff_requests sr where sr.requester_id = p.id and sr.request_type = 'privacy_request')
    ),
    'storage', jsonb_build_object(
      'database_bytes_estimated', private.user_database_bytes(p.id),
      'file_bytes', private.user_file_bytes(p.id),
      'total_bytes', private.user_database_bytes(p.id) + private.user_file_bytes(p.id),
      'file_count', (
        select count(*) from storage.objects o
        where o.owner = p.id or o.owner_id = p.id::text
      ),
      'average_user_total_bytes', v_average_user_bytes,
      'database_total_bytes', pg_database_size(current_database())
    ),
    'contacts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', other.id,
        'display_name', other.display_name,
        'relay_number', other.relay_number,
        'school', other.school,
        'avatar_url', other.avatar_url,
        'connected_at', c.created_at,
        'mutual_count', (
          select count(*)
          from public.connections mine
          where (mine.user_a = p.id or mine.user_b = p.id)
            and exists (
              select 1 from public.connections theirs
              where (
                theirs.user_a = other.id and theirs.user_b = case when mine.user_a = p.id then mine.user_b else mine.user_a end
              ) or (
                theirs.user_b = other.id and theirs.user_a = case when mine.user_a = p.id then mine.user_b else mine.user_a end
              )
            )
        )
      ) order by c.created_at desc)
      from public.connections c
      join public.profiles other
        on other.id = case when c.user_a = p.id then c.user_b else c.user_a end
      where c.user_a = p.id or c.user_b = p.id
    ), '[]'::jsonb),
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'role', gm.role,
        'joined_at', gm.joined_at,
        'member_count', (select count(*) from public.group_members members where members.group_id = g.id),
        'message_count', (
          select count(*) from public.messages m
          join public.conversations c on c.id = m.conversation_id
          where c.group_id = g.id
        ),
        'last_message_at', (
          select max(c.last_message_at) from public.conversations c where c.group_id = g.id
        )
      ) order by gm.joined_at desc)
      from public.group_members gm
      join public.groups g on g.id = gm.group_id
      where gm.user_id = p.id
    ), '[]'::jsonb),
    'conversations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'type', c.type,
        'group_id', c.group_id,
        'group_name', g.name,
        'created_at', c.created_at,
        'last_message_at', c.last_message_at,
        'message_count', (select count(*) from public.messages m where m.conversation_id = c.id),
        'participants', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', pp.id,
            'display_name', pp.display_name,
            'relay_number', pp.relay_number
          ) order by pp.display_name)
          from public.conversation_participants participants
          join public.profiles pp on pp.id = participants.user_id
          where participants.conversation_id = c.id
        ), '[]'::jsonb)
      ) order by c.last_message_at desc)
      from public.conversation_participants mine
      join public.conversations c on c.id = mine.conversation_id
      left join public.groups g on g.id = c.group_id
      where mine.user_id = p.id
    ), '[]'::jsonb),
    'reports', jsonb_build_object(
      'received', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', r.id,
          'reason', r.reason,
          'details', r.details,
          'status', r.status,
          'created_at', r.created_at,
          'message_id', r.message_id,
          'moderation_note', r.moderation_note,
          'reporter_id', r.reporter_id,
          'reporter_name', reporter.display_name
        ) order by r.created_at desc)
        from public.reports r
        join public.profiles reporter on reporter.id = r.reporter_id
        where r.reported_user_id = p.id
      ), '[]'::jsonb),
      'submitted', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', r.id,
          'reason', r.reason,
          'details', r.details,
          'status', r.status,
          'created_at', r.created_at,
          'reported_user_id', r.reported_user_id,
          'reported_name', reported.display_name
        ) order by r.created_at desc)
        from public.reports r
        left join public.profiles reported on reported.id = r.reported_user_id
        where r.reporter_id = p.id
      ), '[]'::jsonb)
    ),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id,
        'note', n.note,
        'created_at', n.created_at,
        'created_by', n.created_by,
        'created_by_name', creator.display_name
      ) order by n.created_at desc)
      from public.owner_user_notes n
      left join public.profiles creator on creator.id = n.created_by
      where n.target_user_id = p.id
    ), '[]'::jsonb),
    'sessions', coalesce((
      select jsonb_agg(session_row order by (session_row->>'refreshed_at') desc nulls last)
      from (
        select jsonb_build_object(
          'id', s.id,
          'created_at', s.created_at,
          'updated_at', s.updated_at,
          'refreshed_at', s.refreshed_at,
          'not_after', s.not_after,
          'user_agent', s.user_agent,
          'aal', s.aal
        ) as session_row
        from auth.sessions s
        where s.user_id = p.id
        order by coalesce(s.refreshed_at::timestamptz, s.updated_at) desc
        limit 8
      ) session_rows
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(event order by event_time desc)
      from (
        select
          re.created_at as event_time,
          jsonb_build_object(
            'type', re.event_type,
            'created_at', re.created_at,
            'other_user_id', re.other_user_id,
            'other_user_name', other.display_name,
            'actor_id', re.actor_id,
            'actor_name', actor.display_name
          ) as event
        from public.relationship_events re
        left join public.profiles other on other.id = re.other_user_id
        left join public.profiles actor on actor.id = re.actor_id
        where re.user_id = p.id

        union all

        select
          a.created_at,
          jsonb_build_object(
            'type', 'staff_action',
            'action', a.action,
            'created_at', a.created_at,
            'actor_id', a.actor_id,
            'actor_name', actor.display_name,
            'metadata', a.metadata
          )
        from public.admin_audit_log a
        left join public.profiles actor on actor.id = a.actor_id
        where a.target_user_id = p.id

        union all

        select
          sr.created_at,
          jsonb_build_object(
            'type', 'staff_request',
            'request_type', sr.request_type,
            'status', sr.status,
            'subject', sr.subject,
            'created_at', sr.created_at
          )
        from public.staff_requests sr
        where sr.requester_id = p.id
      ) combined
      order by event_time desc
      limit 100
    ), '[]'::jsonb)
  ) into v_result
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = p_user_id;

  return v_result;
end;
$$;

create or replace function public.owner_storage_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, private, storage, pg_temp
as $$
declare
  v_average bigint;
begin
  if not public.has_staff_role('owner') then raise exception 'owner permission required'; end if;

  select coalesce(avg(private.user_database_bytes(p.id) + private.user_file_bytes(p.id))::bigint, 0)
  into v_average
  from public.profiles p;

  return jsonb_build_object(
    'database_total_bytes', pg_database_size(current_database()),
    'file_total_bytes', (
      select coalesce(sum(case when coalesce(o.metadata->>'size','') ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 0 end),0)
      from storage.objects o
    ),
    'average_user_total_bytes', v_average,
    'top_users', coalesce((
      select jsonb_agg(row_data order by total_bytes desc)
      from (
        select
          private.user_database_bytes(p.id) + private.user_file_bytes(p.id) as total_bytes,
          jsonb_build_object(
            'id', p.id,
            'display_name', p.display_name,
            'relay_number', p.relay_number,
            'database_bytes_estimated', private.user_database_bytes(p.id),
            'file_bytes', private.user_file_bytes(p.id),
            'total_bytes', private.user_database_bytes(p.id) + private.user_file_bytes(p.id)
          ) as row_data
        from public.profiles p
        order by total_bytes desc
        limit 10
      ) ranked
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.owner_add_user_note(uuid, text) from public, anon;
revoke all on function public.owner_delete_user_note(uuid) from public, anon;
revoke all on function public.owner_user_inspector(uuid) from public, anon;
revoke all on function public.owner_storage_overview() from public, anon;

grant execute on function public.owner_add_user_note(uuid, text) to authenticated;
grant execute on function public.owner_delete_user_note(uuid) to authenticated;
grant execute on function public.owner_user_inspector(uuid) to authenticated;
grant execute on function public.owner_storage_overview() to authenticated;
