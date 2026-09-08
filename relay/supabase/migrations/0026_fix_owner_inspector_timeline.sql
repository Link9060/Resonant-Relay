-- Fix Owner inspector timeline ordering discovered by the authenticated RPC smoke test.

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
  v_database_bytes bigint;
  v_file_bytes bigint;
begin
  if not public.has_staff_role('owner') then raise exception 'owner permission required'; end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then raise exception 'user not found'; end if;

  select private.user_database_bytes(p_user_id), private.user_file_bytes(p_user_id)
  into v_database_bytes, v_file_bytes;

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
      'database_bytes_estimated', v_database_bytes,
      'file_bytes', v_file_bytes,
      'total_bytes', v_database_bytes + v_file_bytes,
      'file_count', (select count(*) from storage.objects o where o.owner = p.id or o.owner_id = p.id::text),
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
              where (theirs.user_a = other.id and theirs.user_b = case when mine.user_a = p.id then mine.user_b else mine.user_a end)
                 or (theirs.user_b = other.id and theirs.user_a = case when mine.user_a = p.id then mine.user_b else mine.user_a end)
            )
        )
      ) order by c.created_at desc)
      from public.connections c
      join public.profiles other on other.id = case when c.user_a = p.id then c.user_b else c.user_a end
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
        'last_message_at', (select max(c.last_message_at) from public.conversations c where c.group_id = g.id)
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
      select jsonb_agg(session_row order by session_sort desc nulls last)
      from (
        select
          jsonb_build_object(
            'id', s.id,
            'created_at', s.created_at,
            'updated_at', s.updated_at,
            'refreshed_at', s.refreshed_at,
            'not_after', s.not_after,
            'user_agent', s.user_agent,
            'aal', s.aal
          ) as session_row,
          coalesce(s.refreshed_at::timestamptz, s.updated_at) as session_sort
        from auth.sessions s
        where s.user_id = p.id
        order by session_sort desc
        limit 8
      ) session_rows
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(limited.event order by limited.event_time desc)
      from (
        select combined.event_time, combined.event
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
        order by combined.event_time desc
        limit 100
      ) limited
    ), '[]'::jsonb)
  ) into v_result
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = p_user_id;

  return v_result;
end;
$$;
