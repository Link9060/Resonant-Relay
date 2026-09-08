-- Secure profile editing + Relay Beta access management.

create table if not exists public.beta_testers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz not null default now(),
  active boolean not null default true,
  revoked_by uuid references public.profiles(id) on delete set null,
  revoked_at timestamptz,
  note text,
  constraint beta_testers_note_length check (note is null or char_length(note) <= 1000)
);

create table if not exists public.beta_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  request_message text,
  response_message text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beta_access_request_message_length check (request_message is null or char_length(request_message) <= 1000),
  constraint beta_access_response_message_length check (response_message is null or char_length(response_message) <= 1000)
);

create unique index if not exists beta_access_requests_one_pending_per_user
  on public.beta_access_requests(user_id)
  where status = 'pending';

create index if not exists beta_access_requests_status_created_idx
  on public.beta_access_requests(status, created_at desc);

create index if not exists beta_testers_active_approved_idx
  on public.beta_testers(active, approved_at desc);

alter table public.beta_testers enable row level security;
alter table public.beta_access_requests enable row level security;

revoke all on public.beta_testers from anon, authenticated;
revoke all on public.beta_access_requests from anon, authenticated;

-- Keep Owner access to Beta from the moment this migration ships.
insert into public.beta_testers(user_id, approved_by, approved_at, active, note)
select p.id, p.id, now(), true, 'Owner Beta access'
from public.profiles p
where p.role = 'owner'::public.app_role
on conflict (user_id) do update
set active = true,
    revoked_by = null,
    revoked_at = null;

create or replace function public.save_profile_settings(
  p_first_name text,
  p_last_name text,
  p_username text,
  p_bio text default null,
  p_school text default null,
  p_graduation_year integer default null,
  p_avatar_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
  current_row public.profiles%rowtype;
  clean_first text := trim(coalesce(p_first_name, ''));
  clean_last text := trim(coalesce(p_last_name, ''));
  clean_username text := private.clean_relay_username(p_username);
  clean_bio text := nullif(trim(coalesce(p_bio, '')), '');
  clean_school text := nullif(trim(coalesce(p_school, '')), '');
  clean_avatar text := nullif(trim(coalesce(p_avatar_url, '')), '');
  next_allowed timestamptz;
begin
  if caller is null then raise exception 'not authenticated'; end if;

  if char_length(clean_first) < 1 or char_length(clean_first) > 40 then
    raise exception 'first name must be 1–40 characters';
  end if;
  if char_length(clean_last) < 1 or char_length(clean_last) > 60 then
    raise exception 'last name must be 1–60 characters';
  end if;
  if clean_bio is not null and char_length(clean_bio) > 160 then
    raise exception 'bio must be 160 characters or fewer';
  end if;
  if clean_school is not null and char_length(clean_school) > 80 then
    raise exception 'school must be 80 characters or fewer';
  end if;
  if p_graduation_year is not null and (p_graduation_year < 2000 or p_graduation_year > 2100) then
    raise exception 'choose a valid graduation year';
  end if;
  if clean_avatar is not null and (char_length(clean_avatar) > 500 or clean_avatar !~ '^https://') then
    raise exception 'profile photo must use a full HTTPS link';
  end if;

  select * into current_row
  from public.profiles
  where id = caller
  for update;

  if current_row.id is null then raise exception 'profile unavailable'; end if;

  if clean_username = '' then
    if current_row.username is not null then
      raise exception 'choose a username instead of leaving it blank';
    end if;
    clean_username := null;
  else
    if clean_username !~ '^[a-z0-9_]{3,20}$' then
      raise exception 'username must be 3–20 letters, numbers, or underscores';
    end if;
    if private.relay_username_reserved(clean_username) then
      raise exception 'that username is reserved';
    end if;

    if lower(coalesce(current_row.username, '')) <> clean_username then
      if current_row.username_changed_at is not null then
        next_allowed := current_row.username_changed_at + interval '14 days';
        if next_allowed > now() then
          raise exception 'username can be changed again after %', next_allowed;
        end if;
      end if;

      if exists (
        select 1 from public.profiles p
        where lower(p.username) = clean_username and p.id <> caller
      ) then
        raise exception 'username unavailable';
      end if;

      if current_row.username is not null then
        insert into public.username_history(user_id, username)
        values (caller, current_row.username);
      end if;

      current_row.username_changed_at := now();
    end if;
  end if;

  update public.profiles
  set first_name = clean_first,
      last_name = clean_last,
      display_name = clean_first || ' ' || clean_last,
      username = clean_username,
      username_changed_at = current_row.username_changed_at,
      bio = clean_bio,
      school = clean_school,
      graduation_year = p_graduation_year,
      avatar_url = clean_avatar,
      updated_at = now()
  where id = caller
  returning * into current_row;

  return jsonb_build_object(
    'id', current_row.id,
    'display_name', current_row.display_name,
    'first_name', current_row.first_name,
    'last_name', current_row.last_name,
    'username', current_row.username,
    'username_changed_at', current_row.username_changed_at,
    'bio', current_row.bio,
    'school', current_row.school,
    'graduation_year', current_row.graduation_year,
    'avatar_url', current_row.avatar_url,
    'relay_number', current_row.relay_number,
    'role', current_row.role
  );
exception
  when unique_violation then raise exception 'username unavailable';
end;
$$;

revoke all on function public.save_profile_settings(text,text,text,text,text,integer,text) from public;
grant execute on function public.save_profile_settings(text,text,text,text,text,integer,text) to authenticated;

create or replace function public.beta_access_status()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
  grant_row public.beta_testers%rowtype;
  request_row public.beta_access_requests%rowtype;
begin
  if caller is null then raise exception 'not authenticated'; end if;

  select * into grant_row
  from public.beta_testers
  where user_id = caller and active = true;

  select * into request_row
  from public.beta_access_requests
  where user_id = caller
  order by created_at desc
  limit 1;

  return jsonb_build_object(
    'approved', grant_row.user_id is not null,
    'approved_at', grant_row.approved_at,
    'request_id', request_row.id,
    'request_status', case when grant_row.user_id is not null then 'approved' else request_row.status end,
    'request_message', request_row.request_message,
    'response_message', request_row.response_message,
    'requested_at', request_row.created_at,
    'reviewed_at', request_row.reviewed_at
  );
end;
$$;

revoke all on function public.beta_access_status() from public;
grant execute on function public.beta_access_status() to authenticated;

create or replace function public.request_beta_access(p_message text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
  clean_message text := nullif(trim(coalesce(p_message, '')), '');
  existing_request public.beta_access_requests%rowtype;
  recent_count integer;
begin
  if caller is null then raise exception 'not authenticated'; end if;
  if clean_message is not null and char_length(clean_message) > 1000 then
    raise exception 'request message must be 1000 characters or fewer';
  end if;

  if exists (select 1 from public.beta_testers b where b.user_id = caller and b.active = true) then
    return jsonb_build_object('status', 'approved', 'approved', true);
  end if;

  select * into existing_request
  from public.beta_access_requests
  where user_id = caller and status = 'pending'
  order by created_at desc
  limit 1;

  if existing_request.id is not null then
    return jsonb_build_object(
      'status', 'pending',
      'approved', false,
      'request_id', existing_request.id,
      'requested_at', existing_request.created_at
    );
  end if;

  select count(*) into recent_count
  from public.beta_access_requests
  where user_id = caller
    and created_at > now() - interval '30 days';

  if recent_count >= 5 then
    raise exception 'too many beta access requests — try again later';
  end if;

  insert into public.beta_access_requests(user_id, request_message)
  values (caller, clean_message)
  returning * into existing_request;

  return jsonb_build_object(
    'status', existing_request.status,
    'approved', false,
    'request_id', existing_request.id,
    'requested_at', existing_request.created_at
  );
end;
$$;

revoke all on function public.request_beta_access(text) from public;
grant execute on function public.request_beta_access(text) to authenticated;

create or replace function public.admin_list_beta_testers(
  p_limit integer default 250,
  p_offset integer default 0
)
returns table(
  user_id uuid,
  display_name text,
  username text,
  relay_number text,
  primary_email text,
  role public.app_role,
  approved_at timestamptz,
  approved_by_name text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.has_staff_role('admin'::public.app_role) then
    raise exception 'admin permission required';
  end if;

  return query
  select
    p.id,
    p.display_name,
    p.username,
    p.relay_number,
    u.email::text,
    p.role,
    b.approved_at,
    approver.display_name
  from public.beta_testers b
  join public.profiles p on p.id = b.user_id
  left join auth.users u on u.id = p.id
  left join public.profiles approver on approver.id = b.approved_by
  where b.active = true
  order by b.approved_at desc, lower(p.display_name)
  limit least(greatest(coalesce(p_limit, 250), 1), 500)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.admin_list_beta_testers(integer,integer) from public;
grant execute on function public.admin_list_beta_testers(integer,integer) to authenticated;

create or replace function public.owner_list_beta_requests(
  p_status text default 'pending',
  p_limit integer default 250,
  p_offset integer default 0
)
returns table(
  request_id uuid,
  user_id uuid,
  display_name text,
  username text,
  relay_number text,
  primary_email text,
  role public.app_role,
  request_status text,
  request_message text,
  response_message text,
  requested_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by_name text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if public.current_app_role() <> 'owner'::public.app_role then
    raise exception 'owner permission required';
  end if;

  if p_status is not null and p_status not in ('pending','approved','declined','all') then
    raise exception 'invalid beta request status';
  end if;

  return query
  select
    r.id,
    p.id,
    p.display_name,
    p.username,
    p.relay_number,
    u.email::text,
    p.role,
    r.status,
    r.request_message,
    r.response_message,
    r.created_at,
    r.reviewed_at,
    reviewer.display_name
  from public.beta_access_requests r
  join public.profiles p on p.id = r.user_id
  left join auth.users u on u.id = p.id
  left join public.profiles reviewer on reviewer.id = r.reviewed_by
  where coalesce(p_status, 'pending') = 'all' or r.status = coalesce(p_status, 'pending')
  order by case when r.status = 'pending' then 0 else 1 end, r.created_at desc
  limit least(greatest(coalesce(p_limit, 250), 1), 500)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke all on function public.owner_list_beta_requests(text,integer,integer) from public;
grant execute on function public.owner_list_beta_requests(text,integer,integer) to authenticated;

create or replace function public.owner_review_beta_request(
  p_request_id uuid,
  p_approve boolean,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
  clean_message text := nullif(trim(coalesce(p_message, '')), '');
  request_row public.beta_access_requests%rowtype;
  next_status text;
begin
  if caller is null or public.current_app_role() <> 'owner'::public.app_role then
    raise exception 'owner permission required';
  end if;
  if clean_message is not null and char_length(clean_message) > 1000 then
    raise exception 'response message must be 1000 characters or fewer';
  end if;

  select * into request_row
  from public.beta_access_requests
  where id = p_request_id
  for update;

  if request_row.id is null then raise exception 'beta request unavailable'; end if;
  if request_row.status <> 'pending' then raise exception 'beta request has already been reviewed'; end if;

  next_status := case when coalesce(p_approve, false) then 'approved' else 'declined' end;

  update public.beta_access_requests
  set status = next_status,
      response_message = clean_message,
      reviewed_by = caller,
      reviewed_at = now(),
      updated_at = now()
  where id = request_row.id;

  if next_status = 'approved' then
    insert into public.beta_testers(user_id, approved_by, approved_at, active, revoked_by, revoked_at, note)
    values (request_row.user_id, caller, now(), true, null, null, clean_message)
    on conflict (user_id) do update
    set approved_by = excluded.approved_by,
        approved_at = excluded.approved_at,
        active = true,
        revoked_by = null,
        revoked_at = null,
        note = excluded.note;
  end if;

  insert into public.admin_audit_log(actor_id, action, target_user_id, metadata)
  values (
    caller,
    case when next_status = 'approved' then 'beta_access_approved' else 'beta_access_declined' end,
    request_row.user_id,
    jsonb_build_object('request_id', request_row.id, 'message', clean_message)
  );

  return jsonb_build_object(
    'request_id', request_row.id,
    'user_id', request_row.user_id,
    'status', next_status,
    'message', clean_message
  );
end;
$$;

revoke all on function public.owner_review_beta_request(uuid,boolean,text) from public;
grant execute on function public.owner_review_beta_request(uuid,boolean,text) to authenticated;

create or replace function public.owner_revoke_beta_access(
  p_user_id uuid,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := (select auth.uid());
  clean_message text := nullif(trim(coalesce(p_message, '')), '');
  target_role public.app_role;
begin
  if caller is null or public.current_app_role() <> 'owner'::public.app_role then
    raise exception 'owner permission required';
  end if;
  if p_user_id is null then raise exception 'user required'; end if;
  if clean_message is not null and char_length(clean_message) > 1000 then
    raise exception 'message must be 1000 characters or fewer';
  end if;

  select role into target_role from public.profiles where id = p_user_id;
  if target_role is null then raise exception 'user unavailable'; end if;
  if target_role = 'owner'::public.app_role then raise exception 'owner beta access cannot be revoked'; end if;

  update public.beta_testers
  set active = false,
      revoked_by = caller,
      revoked_at = now(),
      note = coalesce(clean_message, note)
  where user_id = p_user_id and active = true;

  if not found then raise exception 'beta access is not active'; end if;

  insert into public.admin_audit_log(actor_id, action, target_user_id, metadata)
  values (caller, 'beta_access_revoked', p_user_id, jsonb_build_object('message', clean_message));

  return jsonb_build_object('user_id', p_user_id, 'active', false, 'message', clean_message);
end;
$$;

revoke all on function public.owner_revoke_beta_access(uuid,text) from public;
grant execute on function public.owner_revoke_beta_access(uuid,text) to authenticated;
