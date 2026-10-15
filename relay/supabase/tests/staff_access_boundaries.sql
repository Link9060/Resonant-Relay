-- Run as the database administrator. Every profile change is rolled back.
-- Existing records are read only through count queries; no account action is executed.
begin;
do $$
declare
  actor uuid;
  real_owner uuid;
  role_name public.app_role;
  probe record;
  permitted boolean;
  expected boolean;
  cross_rows bigint;
begin
  select id into actor from public.profiles where role='user' and banned_at is null limit 1;
  select id into real_owner from public.profiles where role='owner' and banned_at is null limit 1;
  if real_owner is null then raise exception 'An owner profile is required for rollback-only setup'; end if;
  if actor is null then raise exception 'A normal-user profile is required for this rollback-only test'; end if;
  foreach role_name in array array['user','moderator','admin','owner']::public.app_role[] loop
    perform set_config('request.jwt.claim.sub',real_owner::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',real_owner,'role','authenticated')::text,true);
    update public.profiles set role=role_name where id=actor;
    perform set_config('request.jwt.claim.sub',actor::text,true);
    perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
    set local role authenticated;
    if public.current_app_role()<>role_name then raise exception 'Live role resolution failed for %',role_name; end if;
    for probe in select * from (values
      ('requests',1,'select count(*) from public.staff_list_requests(null,1,0)'),
      ('reports',1,'select count(*) from public.staff_list_reports(null,1,0)'),
      ('accounts',2,'select count(*) from public.admin_list_users_v2(1,0)'),
      ('beta testers',2,'select count(*) from public.admin_list_beta_testers(1,0)'),
      ('overview',3,'select public.owner_dashboard_stats() is not null'),
      ('storage',3,'select public.owner_storage_overview() is not null'),
      ('audit',3,'select count(*) from public.owner_list_audit_log(1,0)'),
      ('beta applications',3,'select count(*) from public.owner_list_beta_requests(''all'',1,0)')
    ) as probes(label,minimum,query) loop
      permitted=true;
      begin execute probe.query;
      exception when others then
        if sqlerrm ~* '(permission required|staff permission|required|not authorized)' then permitted=false;
        else raise exception 'Unexpected error in % for %: %',probe.label,role_name,sqlerrm; end if;
      end;
      expected=public.role_rank(role_name)>=probe.minimum;
      if permitted<>expected then raise exception 'Access mismatch: role %, endpoint %, allowed %, expected %',role_name,probe.label,permitted,expected; end if;
    end loop;
    -- A user cannot gain privileges by editing their own profile through REST.
    begin
      update public.profiles set role='owner' where id=actor;
      raise exception 'Direct role escalation was allowed';
    exception when insufficient_privilege then null; end;
    if role_name<>'owner' then
      for probe in select query from (values
        ('select public.set_user_role(null,''admin'')'),
        ('select public.owner_set_user_ban(null,true,''access test'')'),
        ('select public.owner_force_sign_out(null)'),
        ('select public.owner_delete_user(null)'),
        ('select public.owner_user_inspector(null)'),
        ('select public.owner_add_user_note(null,''access test'')'),
        ('select public.owner_review_beta_request(null,true,''access test'')'),
        ('select public.owner_revoke_beta_access(null,null)'),
        ('select public.owner_approve_role_request(null,null)')
      ) as mutations(query) loop
        permitted=true;
        begin execute probe.query;
        exception when others then
          if sqlerrm ~* '(owner permission required|not authorized)' then permitted=false;
          else raise exception 'Unexpected mutation error for %: %',role_name,sqlerrm; end if;
        end;
        if permitted then raise exception 'Owner mutation allowed for %',role_name; end if;
      end loop;
    end if;
    if role_name='user' then
      for probe in select query from (values
        ('select public.staff_update_request_status(null,''reviewing'',null)'),
        ('select public.staff_update_report_status(null,''reviewing'',null)'),
        ('select public.staff_update_support_thread(null,''open'',null)')
      ) as mutations(query) loop
        permitted=true;
        begin execute probe.query;
        exception when others then
          if sqlerrm ~* '(permission required|not authorized)' then permitted=false;
          else raise exception 'Unexpected staff mutation error: %',sqlerrm; end if;
        end;
        if permitted then raise exception 'Normal user staff mutation was allowed'; end if;
      end loop;
      select count(*) into cross_rows from public.staff_requests where requester_id<>actor;
      if cross_rows<>0 then raise exception 'Normal user can read other staff requests'; end if;
      select count(*) into cross_rows from public.support_email_threads;
      if cross_rows<>0 then raise exception 'Normal user can read support inbox'; end if;
      select count(*) into cross_rows from public.support_email_messages;
      if cross_rows<>0 then raise exception 'Normal user can read support messages'; end if;
      select count(*) into cross_rows from public.admin_audit_log;
      if cross_rows<>0 then raise exception 'Normal user can read audit log'; end if;
    end if;
    reset role;
  end loop;
  perform set_config('request.jwt.claim.sub',real_owner::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',real_owner,'role','authenticated')::text,true);
  update public.profiles set role='owner',banned_at=now() where id=actor;
  perform set_config('request.jwt.claim.sub',actor::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  set local role authenticated;
  if public.current_app_role()<>'user' or public.has_staff_role('moderator') then raise exception 'Suspended staff retained access'; end if;
  reset role;
  if public.staff_can_view_request_type('moderator','privacy_request') or public.staff_can_view_request_type('admin','role_application') or not public.staff_can_view_request_type('moderator','safety_report') then raise exception 'Request routing mismatch'; end if;
  if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'owner_%' or p.proname like 'staff_%' or p.proname in ('admin_list_users_v2','set_user_role')) and has_function_privilege('anon',p.oid,'execute')) then raise exception 'Anonymous staff RPC execution remains enabled'; end if;
end;
$$;
rollback;
select 'All four role boundaries, owner mutation denials, table isolation, anonymous grants and suspended-staff checks passed; all fixture changes rolled back.' as result;
