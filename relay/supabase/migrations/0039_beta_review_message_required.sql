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
  if clean_message is null then
    raise exception 'response message required';
  end if;
  if char_length(clean_message) > 1000 then
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
revoke execute on function public.owner_review_beta_request(uuid,boolean,text) from anon;
grant execute on function public.owner_review_beta_request(uuid,boolean,text) to authenticated;
