-- Keep undated future actions in waypoint_items; legacy Relay requires dated todos.
alter table public.todos add column if not exists priority text not null default 'medium' check (priority in ('low','medium','high'));
alter table public.todos add column if not exists depends_on jsonb not null default '[]'::jsonb check (jsonb_typeof(depends_on) = 'array');

create or replace function public.arrow_apply_capture(p_capture_id uuid, p_items jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  item jsonb; kind text; place text; title text; key text; day date; start_at time; end_at time; duration integer; deps jsonb;
  task_ids jsonb := '{}'::jsonb; task_id uuid; applied_before boolean;
begin
  if owner_id is null then raise exception 'Sign in before applying a Capture'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 14 then raise exception 'Select 1 to 14 items'; end if;
  select applied into applied_before from public.waypoint_captures where id=p_capture_id and user_id=owner_id for update;
  if not found then raise exception 'Capture does not belong to this account'; end if;
  if applied_before then return jsonb_build_object('applied',true,'already_applied',true); end if;
  -- Allocate IDs first so dependencies can reference another approved task in this batch.
  for item in select value from jsonb_array_elements(p_items) loop
    if item->>'type'='task' and nullif(item->>'date','') is not null then
      select id into task_id from public.todos where user_id=owner_id and source_key='waypoint:'||(item->>'id');
      task_id := coalesce(task_id,gen_random_uuid());
      task_ids := task_ids || jsonb_build_object(lower(trim(item->>'title')),task_id::text);
    end if;
  end loop;
  for item in select value from jsonb_array_elements(p_items) loop
    kind:=item->>'type'; place:=coalesce(nullif(item->>'placement',''),'plans'); title:=trim(item->>'title'); key:='waypoint:'||(item->>'id');
    if kind not in ('task','event','note','goal','project','later') or place not in ('today','plans','calendar','direction','notes','later') or title is null or length(title) not between 1 and 120 or item->>'id' is null then raise exception 'Invalid Capture item'; end if;
    day:=nullif(item->>'date','')::date; start_at:=nullif(item->>'time','')::time; duration:=nullif(item->>'duration_minutes','')::integer;
    if duration is not null and (duration<1 or duration>1440 or (kind='task' and (duration<5 or duration>720))) then raise exception 'Invalid duration'; end if;
    if jsonb_typeof(coalesce(item->'depends_on','[]'::jsonb)) <> 'array' then raise exception 'Prerequisites must be a list'; end if;
    select coalesce(jsonb_agg(coalesce(task_ids->>lower(trim(value)),(select t.id::text from public.todos t where t.user_id=owner_id and (t.id::text=value or lower(trim(t.title))=lower(trim(value))) order by t.created_at limit 1),value)), '[]'::jsonb) into deps from jsonb_array_elements_text(coalesce(item->'depends_on','[]'::jsonb));
    if kind='event' then
      if day is null then raise exception 'Calendar events need a date'; end if;
      end_at:=null;
      if start_at is not null and duration is not null then
        if extract(epoch from start_at)/60+duration >= 1440 then raise exception 'Split events crossing midnight into separate dates'; end if;
        end_at:=(start_at + make_interval(mins=>duration))::time;
      end if;
      insert into public.relay_calendar_events(user_id,title,event_date,is_all_day,start_time,end_time,details,source_key)
      values(owner_id,title,day,start_at is null,start_at,end_at,item->>'context',key) on conflict(user_id,source_key) do nothing;
    elsif kind='task' and day is not null then
      task_id:=(task_ids->>lower(title))::uuid;
      insert into public.todos(id,user_id,title,due_on,estimated_minutes,priority,depends_on,source_key)
      values(task_id,owner_id,title,day,duration,coalesce(item->>'priority','medium'),deps,key) on conflict(user_id,source_key) do nothing;
    elsif kind='note' then
      insert into public.notes(user_id,title,content,source_key) values(owner_id,title,jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'type','paragraph','text',coalesce(nullif(item->>'context',''),title))),key) on conflict(user_id,source_key) do nothing;
    else
      insert into public.waypoint_items(user_id,capture_id,source_key,title,item_type,placement,due_date,due_time,when_text,context,why,priority,duration_minutes,depends_on)
      values(owner_id,p_capture_id,key,title,kind,place,day,start_at,item->>'when',item->>'context',item->>'why',coalesce(item->>'priority','medium'),duration,deps) on conflict(user_id,source_key) do nothing;
    end if;
  end loop;
  update public.waypoint_captures set applied=true,applied_at=now(),updated_at=now() where id=p_capture_id and user_id=owner_id;
  return jsonb_build_object('applied',true,'count',jsonb_array_length(p_items));
end $$;
revoke all on function public.arrow_apply_capture(uuid,jsonb) from public,anon;
grant execute on function public.arrow_apply_capture(uuid,jsonb) to authenticated;

create or replace function public.arrow_schedule_task(p_task_id uuid,p_date date,p_start time,p_end time)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=auth.uid(); task public.todos%rowtype; event_id uuid;
begin
  if owner_id is null then raise exception 'Sign in before scheduling'; end if;
  if p_date is null or p_start is null or p_end is null or p_end<=p_start then raise exception 'Choose a valid same-day time block'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
  select * into task from public.todos where id=p_task_id and user_id=owner_id for update;
  if not found or task.completed then raise exception 'That task is unavailable or completed'; end if;
  if exists(select 1 from public.relay_calendar_events where user_id=owner_id and event_date=p_date and source_key is distinct from ('schedule:'||p_task_id::text) and (is_all_day or (start_time<p_end and coalesce(end_time,start_time+interval '30 minutes')>p_start))) then raise exception 'This time overlaps another calendar event. Refresh the plan'; end if;
  insert into public.relay_calendar_events(user_id,title,event_date,is_all_day,start_time,end_time,source_key)
  values(owner_id,task.title,p_date,false,p_start,p_end,'schedule:'||p_task_id::text)
  on conflict(user_id,source_key) do update set title=excluded.title,event_date=excluded.event_date,start_time=excluded.start_time,end_time=excluded.end_time,updated_at=now()
  returning id into event_id;
  update public.todos set scheduled_on=p_date,scheduled_start=p_start,updated_at=now() where id=p_task_id and user_id=owner_id;
  return jsonb_build_object('task_id',p_task_id,'event_id',event_id);
end $$;
revoke all on function public.arrow_schedule_task(uuid,date,time,time) from public,anon;
grant execute on function public.arrow_schedule_task(uuid,date,time,time) to authenticated;
