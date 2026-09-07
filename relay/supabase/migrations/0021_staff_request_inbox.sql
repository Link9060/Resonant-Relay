-- RELAY — STAFF REQUEST INBOX
-- Native intake for bugs, role applications, feature requests, safety concerns,
-- general feedback, and privacy/data requests.

create table public.staff_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in (
    'bug_report',
    'role_application',
    'feature_request',
    'safety_report',
    'general_feedback',
    'privacy_request'
  )),
  subject text not null check (char_length(subject) between 3 and 120),
  description text not null check (char_length(description) between 10 and 5000),
  requested_role public.app_role,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'dismissed')),
  staff_note text,
  handled_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_requests_role_application_role check (
    (request_type = 'role_application' and requested_role in ('moderator', 'admin'))
    or (request_type <> 'role_application' and requested_role is null)
  )
);

create index staff_requests_created_idx on public.staff_requests(created_at desc);
create index staff_requests_status_idx on public.staff_requests(status, created_at desc);
create index staff_requests_type_idx on public.staff_requests(request_type, status, created_at desc);
create index staff_requests_requester_idx on public.staff_requests(requester_id, created_at desc);

alter table public.staff_requests enable row level security;

create policy "staff_requests_own_read"
  on public.staff_requests for select
  using (requester_id = auth.uid());

create policy "staff_requests_no_direct_insert"
  on public.staff_requests for insert
  with check (false);

create policy "staff_requests_no_direct_update"
  on public.staff_requests for update
  using (false)
  with check (false);

create policy "staff_requests_no_direct_delete"
  on public.staff_requests for delete
  using (false);

create or replace function public.staff_can_view_request_type(
  p_role public.app_role,
  p_request_type text
)
returns boolean
language sql
immutable
as $$
  select case p_role
    when 'owner' then true
    when 'admin' then p_request_type in ('bug_report', 'feature_request', 'safety_report', 'general_feedback')
    when 'moderator' then p_request_type = 'safety_report'
    else false
  end;
$$;

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
set search_path = public
as $$
declare
  v_id uuid;
  v_subject text := btrim(coalesce(p_subject, ''));
  v_description text := btrim(coalesce(p_description, ''));
begin
  if auth.uid() is null then
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

  if p_request_type = 'role_application' then
    if p_requested_role not in ('moderator', 'admin') then
      raise exception 'role applications may request moderator or admin';
    end if;
  else
    p_requested_role := null;
  end if;

  insert into public.staff_requests (
    requester_id, request_type, subject, description, requested_role, metadata
  ) values (
    auth.uid(), p_request_type, v_subject, v_description, p_requested_role,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.staff_list_requests(
  p_status text default null,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  request_id uuid,
  request_type text,
  subject text,
  description text,
  requested_role public.app_role,
  metadata jsonb,
  status text,
  staff_note text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz,
  requester_id uuid,
  requester_name text,
  requester_relay_number text,
  handled_by uuid,
  handled_by_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.app_role := public.current_app_role();
begin
  if not public.has_staff_role('moderator') then
    raise exception 'staff permission required';
  end if;

  return query
  select
    r.id,
    r.request_type,
    r.subject,
    r.description,
    r.requested_role,
    r.metadata,
    r.status,
    r.staff_note,
    r.created_at,
    r.updated_at,
    r.resolved_at,
    r.requester_id,
    requester.display_name,
    requester.relay_number,
    r.handled_by,
    handler.display_name
  from public.staff_requests r
  join public.profiles requester on requester.id = r.requester_id
  left join public.profiles handler on handler.id = r.handled_by
  where public.staff_can_view_request_type(v_role, r.request_type)
    and (p_status is null or r.status = p_status)
  order by
    case r.status when 'new' then 0 when 'reviewing' then 1 else 2 end,
    r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 250))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.staff_update_request_status(
  p_request_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.staff_requests%rowtype;
  v_role public.app_role := public.current_app_role();
begin
  if not public.has_staff_role('moderator') then
    raise exception 'staff permission required';
  end if;

  if p_status not in ('new', 'reviewing', 'resolved', 'dismissed') then
    raise exception 'invalid request status';
  end if;

  select * into v_request from public.staff_requests where id = p_request_id;
  if not found then
    raise exception 'request not found';
  end if;

  if not public.staff_can_view_request_type(v_role, v_request.request_type) then
    raise exception 'permission denied for this request type';
  end if;

  update public.staff_requests
  set
    status = p_status,
    staff_note = case when p_note is null then staff_note else left(p_note, 2000) end,
    handled_by = auth.uid(),
    resolved_at = case when p_status in ('resolved', 'dismissed') then now() else null end,
    updated_at = now()
  where id = p_request_id;

  insert into public.admin_audit_log(actor_id, action, target_user_id, metadata)
  values (
    auth.uid(),
    'staff_request_status',
    v_request.requester_id,
    jsonb_build_object(
      'request_id', p_request_id,
      'request_type', v_request.request_type,
      'old_status', v_request.status,
      'new_status', p_status
    )
  );
end;
$$;

create or replace function public.owner_approve_role_request(
  p_request_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.staff_requests%rowtype;
begin
  if not public.has_staff_role('owner') then
    raise exception 'owner permission required';
  end if;

  select * into v_request
  from public.staff_requests
  where id = p_request_id
  for update;

  if not found or v_request.request_type <> 'role_application' then
    raise exception 'role application not found';
  end if;

  if v_request.status in ('resolved', 'dismissed') then
    raise exception 'role application is already closed';
  end if;

  if v_request.requested_role not in ('moderator', 'admin') then
    raise exception 'invalid requested role';
  end if;

  perform public.set_user_role(v_request.requester_id, v_request.requested_role);

  update public.staff_requests
  set
    status = 'resolved',
    staff_note = coalesce(nullif(left(p_note, 2000), ''), 'Role application approved.'),
    handled_by = auth.uid(),
    resolved_at = now(),
    updated_at = now()
  where id = p_request_id;
end;
$$;

grant select on public.staff_requests to authenticated;
grant execute on function public.submit_staff_request(text, text, text, public.app_role, jsonb) to authenticated;
grant execute on function public.staff_list_requests(text, integer, integer) to authenticated;
grant execute on function public.staff_update_request_status(uuid, text, text) to authenticated;
grant execute on function public.owner_approve_role_request(uuid, text) to authenticated;
