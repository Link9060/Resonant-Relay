-- Public release hardening: close request bypasses, rate-limit public write paths,
-- enforce attachment send/quota rules, preserve group administration, and add
-- indexes for common relationship/moderation queries.

-- Connection requests are intentionally mutated only through SECURITY DEFINER
-- RPCs (send/accept/decline/cancel), where block checks, rate limits, and
-- participant identity are enforced. Keep direct reads for participants.
revoke insert, update, delete, truncate, references, trigger
  on table public.connection_requests from anon, authenticated;
grant select on table public.connection_requests to authenticated;

-- Message rate limiting is enforced in the database so custom clients cannot
-- bypass it. Limits are deliberately generous enough for normal group chat.
create or replace function private.enforce_message_send_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender uuid := (select auth.uid());
  v_burst integer;
  v_minute integer;
begin
  if v_sender is null or new.sender_id <> v_sender then
    raise exception 'invalid message sender';
  end if;

  select count(*) into v_burst
  from public.messages m
  where m.sender_id = v_sender
    and m.created_at > now() - interval '10 seconds';

  if v_burst >= 25 then
    raise exception 'message rate limit reached — wait a few seconds';
  end if;

  select count(*) into v_minute
  from public.messages m
  where m.sender_id = v_sender
    and m.created_at > now() - interval '1 minute';

  if v_minute >= 100 then
    raise exception 'message rate limit reached — wait a minute';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_message_send_rate() from public, anon, authenticated;

drop trigger if exists messages_public_rate_limit on public.messages;
create trigger messages_public_rate_limit
before insert on public.messages
for each row execute function private.enforce_message_send_rate();

-- Support/staff requests are also public-user writable through one RPC. Add
-- abuse limits and cap metadata payload size to prevent staff-queue flooding.
create or replace function public.submit_staff_request(
  p_request_type text,
  p_subject text,
  p_description text,
  p_requested_role public.app_role default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_id uuid;
  v_user uuid := (select auth.uid());
  v_subject text := btrim(coalesce(p_subject, ''));
  v_description text := btrim(coalesce(p_description, ''));
  v_recent integer;
  v_daily integer;
begin
  if v_user is null then
    raise exception 'sign in required';
  end if;

  if p_request_type not in (
    'bug_report', 'role_application', 'feature_request',
    'safety_report', 'general_feedback', 'privacy_request'
  ) then
    raise exception 'invalid request type';
  end if;

  if char_length(v_subject) < 3 or char_length(v_subject) > 120 then
    raise exception 'subject must be between 3 and 120 characters';
  end if;

  if char_length(v_description) < 10 or char_length(v_description) > 5000 then
    raise exception 'description must be between 10 and 5000 characters';
  end if;

  if octet_length(coalesce(p_metadata, '{}'::jsonb)::text) > 8192 then
    raise exception 'request metadata is too large';
  end if;

  select count(*) into v_recent
  from public.staff_requests
  where requester_id = v_user
    and created_at > now() - interval '10 minutes';
  if v_recent >= 5 then
    raise exception 'too many requests — wait a few minutes and try again';
  end if;

  select count(*) into v_daily
  from public.staff_requests
  where requester_id = v_user
    and created_at > now() - interval '24 hours';
  if v_daily >= 20 then
    raise exception 'daily request limit reached';
  end if;

  if p_request_type = 'role_application' then
    if p_requested_role not in ('moderator', 'admin') then
      raise exception 'role applications may request moderator or admin';
    end if;
    if exists (
      select 1 from public.staff_requests
      where requester_id = v_user
        and request_type = 'role_application'
        and created_at > now() - interval '7 days'
    ) then
      raise exception 'staff applications can be submitted once every 7 days';
    end if;
  else
    p_requested_role := null;
  end if;

  insert into public.staff_requests (
    requester_id, request_type, subject, description, requested_role, metadata
  ) values (
    v_user, p_request_type, v_subject, v_description, p_requested_role,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_staff_request(text, text, text, public.app_role, jsonb) from public, anon;
grant execute on function public.submit_staff_request(text, text, text, public.app_role, jsonb) to authenticated;

-- Attachment uploads require SEND permission, not merely historical READ
-- permission. A launch safety ceiling of 250 MiB per account prevents runaway
-- storage use; the value is centralized here for easy future adjustment.
create or replace function private.can_upload_chat_attachment(
  p_name text,
  p_metadata jsonb,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_parts text[];
  v_conversation uuid;
  v_new_size bigint;
  v_used bigint;
  v_limit constant bigint := 262144000; -- 250 MiB
begin
  if p_user_id is null then return false; end if;
  v_parts := string_to_array(coalesce(p_name, ''), '/');
  if array_length(v_parts, 1) < 2 or v_parts[2] <> p_user_id::text then return false; end if;

  begin
    v_conversation := v_parts[1]::uuid;
  exception when others then
    return false;
  end;

  if not private.can_send_to_conversation(v_conversation, p_user_id) then
    return false;
  end if;

  v_new_size := greatest(
    coalesce((p_metadata ->> 'size')::bigint, (p_metadata ->> 'contentLength')::bigint, 0),
    0
  );
  if v_new_size > 10485760 then return false; end if;

  select coalesce(sum(coalesce((o.metadata ->> 'size')::bigint, 0)), 0)
  into v_used
  from storage.objects o
  where o.bucket_id = 'chat-attachments'
    and (storage.foldername(o.name))[2] = p_user_id::text;

  return v_used + v_new_size <= v_limit;
end;
$$;

revoke all on function private.can_upload_chat_attachment(text, jsonb, uuid) from public, anon, authenticated;

drop policy if exists "Conversation members can upload attachments" on storage.objects;
create policy "Conversation members can upload attachments"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and private.can_upload_chat_attachment(name, metadata, (select auth.uid()))
);

create or replace function public.my_storage_usage()
returns table(used_bytes bigint, limit_bytes bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce(sum(coalesce((o.metadata ->> 'size')::bigint, 0)), 0)::bigint,
    262144000::bigint
  from storage.objects o
  where o.bucket_id = 'chat-attachments'
    and (storage.foldername(o.name))[2] = (select auth.uid())::text;
$$;

revoke all on function public.my_storage_usage() from public, anon;
grant execute on function public.my_storage_usage() to authenticated;

-- Keep every non-empty group administrable when the last admin leaves.
create or replace function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  v_user uuid := (select auth.uid());
  v_conv_id uuid;
  v_was_admin boolean;
  v_remaining integer;
  v_admins integer;
  v_promote uuid;
begin
  if v_user is null then raise exception 'not authenticated'; end if;

  select gm.role = 'admin'
  into v_was_admin
  from public.group_members gm
  where gm.group_id = p_group_id and gm.user_id = v_user;

  if v_was_admin is null then raise exception 'group membership not found'; end if;

  select id into v_conv_id from public.conversations where group_id = p_group_id;

  delete from public.group_members where group_id = p_group_id and user_id = v_user;
  delete from public.conversation_participants where conversation_id = v_conv_id and user_id = v_user;

  select count(*) into v_remaining from public.group_members where group_id = p_group_id;
  if v_remaining = 0 then
    delete from public.groups where id = p_group_id;
    return;
  end if;

  if v_was_admin then
    select count(*) into v_admins
    from public.group_members
    where group_id = p_group_id and role = 'admin';

    if v_admins = 0 then
      select gm.user_id into v_promote
      from public.group_members gm
      where gm.group_id = p_group_id
      order by gm.joined_at asc nulls last, gm.user_id
      limit 1;

      update public.group_members
      set role = 'admin'
      where group_id = p_group_id and user_id = v_promote;
    end if;
  end if;
end;
$$;

revoke all on function public.leave_group(uuid) from public, anon;
grant execute on function public.leave_group(uuid) to authenticated;

-- Cover foreign keys and high-frequency moderation/relationship lookups that
-- the database advisor currently identifies as unindexed.
create index if not exists messages_sender_id_idx on public.messages(sender_id);
create index if not exists messages_reply_to_id_idx on public.messages(reply_to_id) where reply_to_id is not null;
create index if not exists reports_reporter_id_idx on public.reports(reporter_id);
create index if not exists reports_reported_user_id_idx on public.reports(reported_user_id) where reported_user_id is not null;
create index if not exists reports_message_id_idx on public.reports(message_id) where message_id is not null;
create index if not exists reports_resolved_by_idx on public.reports(resolved_by) where resolved_by is not null;
create index if not exists groups_created_by_idx on public.groups(created_by);
create index if not exists staff_requests_handled_by_idx on public.staff_requests(handled_by) where handled_by is not null;
create index if not exists plan_responses_user_id_idx on public.plan_responses(user_id);
create index if not exists plan_responses_option_id_idx on public.plan_responses(option_id) where option_id is not null;
create index if not exists owner_user_notes_created_by_idx on public.owner_user_notes(created_by);
create index if not exists relationship_events_actor_id_idx on public.relationship_events(actor_id) where actor_id is not null;
create index if not exists relationship_events_other_user_id_idx on public.relationship_events(other_user_id) where other_user_id is not null;
create index if not exists admin_audit_log_target_user_id_idx on public.admin_audit_log(target_user_id) where target_user_id is not null;
create index if not exists email_oauth_states_user_id_idx on public.email_oauth_states(user_id);
create index if not exists google_oauth_states_user_id_idx on public.google_oauth_states(user_id);
create index if not exists hidden_messages_user_id_idx on public.hidden_messages(user_id);
create index if not exists message_pins_user_id_idx on public.message_pins(user_id);
create index if not exists message_reactions_user_id_idx on public.message_reactions(user_id);
