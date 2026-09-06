-- Relay owner controls + moderator tooling

alter table public.profiles
  add column if not exists banned_at timestamptz,
  add column if not exists banned_by uuid references public.profiles(id) on delete set null,
  add column if not exists ban_reason text;

alter table public.profiles drop constraint if exists profiles_ban_reason_check;
alter table public.profiles
  add constraint profiles_ban_reason_check check (ban_reason is null or char_length(ban_reason) <= 300);

create index if not exists profiles_banned_at_idx
  on public.profiles (banned_at desc)
  where banned_at is not null;

alter table public.reports
  add column if not exists moderation_note text,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz;

alter table public.reports drop constraint if exists reports_moderation_note_check;
alter table public.reports
  add constraint reports_moderation_note_check check (moderation_note is null or char_length(moderation_note) <= 500);

create index if not exists reports_status_created_idx
  on public.reports (status, created_at desc);

-- Preserve audit history even if a staff account is later removed.
alter table public.admin_audit_log drop constraint if exists admin_audit_log_actor_id_fkey;
alter table public.admin_audit_log alter column actor_id drop not null;
alter table public.admin_audit_log
  add constraint admin_audit_log_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

create or replace function public.staff_list_reports(
  p_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  report_id uuid,
  reason text,
  details text,
  status text,
  created_at timestamptz,
  reporter_id uuid,
  reporter_name text,
  reporter_relay_number text,
  reported_user_id uuid,
  reported_name text,
  reported_relay_number text,
  reported_email text,
  message_id uuid,
  message_body text,
  moderation_note text,
  resolved_at timestamptz,
  resolved_by_name text
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.has_staff_role('moderator') then
    raise exception 'moderator permission required';
  end if;

  if p_status is not null
     and p_status <> 'all'
     and p_status not in ('submitted', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'invalid report status';
  end if;

  return query
  select
    r.id,
    r.reason,
    r.details,
    r.status,
    r.created_at,
    r.reporter_id,
    reporter.display_name,
    reporter.relay_number,
    r.reported_user_id,
    reported.display_name,
    reported.relay_number,
    case when public.has_staff_role('admin') then au.email::text else null::text end,
    r.message_id,
    m.body,
    r.moderation_note,
    r.resolved_at,
    resolver.display_name
  from public.reports r
  join public.profiles reporter on reporter.id = r.reporter_id
  left join public.profiles reported on reported.id = r.reported_user_id
  left join auth.users au on au.id = r.reported_user_id
  left join public.messages m on m.id = r.message_id
  left join public.profiles resolver on resolver.id = r.resolved_by
  where p_status is null or p_status = 'all' or r.status = p_status
  order by
    case r.status when 'submitted' then 0 when 'reviewing' then 1 else 2 end,
    r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 250))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.staff_update_report_status(
  p_report_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_report public.reports%rowtype;
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.has_staff_role('moderator') then
    raise exception 'moderator permission required';
  end if;

  if p_status not in ('submitted', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'invalid report status';
  end if;

  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'moderation note is too long';
  end if;

  select * into v_report
  from public.reports
  where id = p_report_id
  for update;

  if not found then
    raise exception 'report not found';
  end if;

  update public.reports
  set status = p_status,
      moderation_note = case when p_note is null then moderation_note else v_note end,
      resolved_by = case when p_status = 'submitted' then null else auth.uid() end,
      resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end
  where id = p_report_id;

  insert into public.admin_audit_log(actor_id, action, target_user_id, metadata)
  values (
    auth.uid(),
    'update_report_status',
    v_report.reported_user_id,
    jsonb_build_object(
      'report_id', p_report_id,
      'old_status', v_report.status,
      'new_status', p_status
    )
  );
end;
$$;

create or replace function public.admin_list_users_v2(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  display_name text,
  relay_number text,
  school text,
  role public.app_role,
  created_at timestamptz,
  primary_email text,
  last_sign_in_at timestamptz,
  gmail_connected boolean,
  message_count bigint,
  connection_count bigint,
  banned_at timestamptz,
  ban_reason text,
  report_count bigint,
  open_report_count bigint
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.has_staff_role('admin') then
    raise exception 'admin permission required';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.relay_number,
    p.school,
    p.role,
    p.created_at,
    u.email::text,
    u.last_sign_in_at,
    exists(select 1 from public.google_integrations gi where gi.user_id = p.id and gi.service = 'gmail'),
    (select count(*) from public.messages m where m.sender_id = p.id),
    (select count(*) from public.connections c where c.user_a = p.id or c.user_b = p.id),
    p.banned_at,
    p.ban_reason,
    (select count(*) from public.reports r where r.reported_user_id = p.id),
    (select count(*) from public.reports r where r.reported_user_id = p.id and r.status in ('submitted', 'reviewing'))
  from public.profiles p
  left join auth.users u on u.id = p.id
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 250))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.owner_set_user_ban(
  p_user_id uuid,
  p_banned boolean,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_role public.app_role;
  v_name text;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.has_staff_role('owner') then
    raise exception 'owner permission required';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'owners cannot ban their own account';
  end if;

  if v_reason is not null and char_length(v_reason) > 300 then
    raise exception 'ban reason is too long';
  end if;

  select role, display_name into v_role, v_name
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'user not found';
  end if;

  if v_role = 'owner' then
    raise exception 'demote an owner before banning that account';
  end if;

  if p_banned then
    update public.profiles
    set banned_at = now(), banned_by = auth.uid(), ban_reason = v_reason
    where id = p_user_id;

    update auth.users
    set banned_until = now() + interval '100 years', updated_at = now()
    where id = p_user_id;

    delete from auth.refresh_tokens where user_id = p_user_id::text;
    delete from auth.sessions where user_id = p_user_id;
  else
    update public.profiles
    set banned_at = null, banned_by = null, ban_reason = null
    where id = p_user_id;

    update auth.users
    set banned_until = null, updated_at = now()
    where id = p_user_id;
  end if;

  insert into public.admin_audit_log(actor_id, action, target_user_id, metadata)
  values (
    auth.uid(),
    case when p_banned then 'ban_user' else 'unban_user' end,
    p_user_id,
    jsonb_build_object('display_name', v_name, 'reason', v_reason)
  );
end;
$$;

create or replace function public.owner_force_sign_out(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_name text;
begin
  if not public.has_staff_role('owner') then
    raise exception 'owner permission required';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'use the normal sign-out control for your own account';
  end if;

  select display_name into v_name from public.profiles where id = p_user_id;
  if not found then raise exception 'user not found'; end if;

  delete from auth.refresh_tokens where user_id = p_user_id::text;
  delete from auth.sessions where user_id = p_user_id;

  insert into public.admin_audit_log(actor_id, action, target_user_id, metadata)
  values (auth.uid(), 'force_sign_out', p_user_id, jsonb_build_object('display_name', v_name));
end;
$$;

create or replace function public.owner_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_role public.app_role;
  v_name text;
  v_email text;
begin
  if not public.has_staff_role('owner') then
    raise exception 'owner permission required';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'owners cannot remove their own account here';
  end if;

  select p.role, p.display_name, u.email::text
  into v_role, v_name, v_email
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.id = p_user_id
  for update of p;

  if not found then
    raise exception 'user not found';
  end if;

  if v_role = 'owner' then
    raise exception 'demote an owner before removing that account';
  end if;

  insert into public.admin_audit_log(actor_id, action, target_user_id, metadata)
  values (
    auth.uid(),
    'delete_user',
    p_user_id,
    jsonb_build_object(
      'target_id', p_user_id,
      'display_name', v_name,
      'email', v_email,
      'role', v_role
    )
  );

  delete from auth.refresh_tokens where user_id = p_user_id::text;
  delete from auth.sessions where user_id = p_user_id;
  delete from auth.users where id = p_user_id;

  if not found then
    raise exception 'auth account not found';
  end if;
end;
$$;

create or replace function public.owner_list_audit_log(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id bigint,
  created_at timestamptz,
  action text,
  actor_id uuid,
  actor_name text,
  actor_email text,
  target_user_id uuid,
  target_name text,
  target_email text,
  metadata jsonb
)
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.has_staff_role('owner') then
    raise exception 'owner permission required';
  end if;

  return query
  select
    l.id,
    l.created_at,
    l.action,
    l.actor_id,
    actor.display_name,
    actor_auth.email::text,
    l.target_user_id,
    target.display_name,
    target_auth.email::text,
    l.metadata
  from public.admin_audit_log l
  left join public.profiles actor on actor.id = l.actor_id
  left join auth.users actor_auth on actor_auth.id = l.actor_id
  left join public.profiles target on target.id = l.target_user_id
  left join auth.users target_auth on target_auth.id = l.target_user_id
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 250))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.staff_list_reports(text, integer, integer) from public, anon;
revoke all on function public.staff_update_report_status(uuid, text, text) from public, anon;
revoke all on function public.admin_list_users_v2(integer, integer) from public, anon;
revoke all on function public.owner_set_user_ban(uuid, boolean, text) from public, anon;
revoke all on function public.owner_force_sign_out(uuid) from public, anon;
revoke all on function public.owner_delete_user(uuid) from public, anon;
revoke all on function public.owner_list_audit_log(integer, integer) from public, anon;

grant execute on function public.staff_list_reports(text, integer, integer) to authenticated;
grant execute on function public.staff_update_report_status(uuid, text, text) to authenticated;
grant execute on function public.admin_list_users_v2(integer, integer) to authenticated;
grant execute on function public.owner_set_user_ban(uuid, boolean, text) to authenticated;
grant execute on function public.owner_force_sign_out(uuid) to authenticated;
grant execute on function public.owner_delete_user(uuid) to authenticated;
grant execute on function public.owner_list_audit_log(integer, integer) to authenticated;
