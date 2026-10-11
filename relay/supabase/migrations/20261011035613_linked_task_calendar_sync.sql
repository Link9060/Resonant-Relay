-- Only explicit schedule:<task UUID> links sync. Independent events stay independent.
create or replace function public.arrow_sync_task_calendar()
returns trigger language plpgsql security invoker set search_path='' as $$
declare linked public.relay_calendar_events%rowtype; minutes integer; ends time;
begin
 if pg_trigger_depth()>1 then return null; end if;
 if TG_OP='DELETE' then
  delete from public.relay_calendar_events where user_id=OLD.user_id and source_key='schedule:'||OLD.id::text;
  return null;
 end if;
 if NEW.completed or NEW.scheduled_on is null or NEW.scheduled_start is null then
  delete from public.relay_calendar_events where user_id=NEW.user_id and source_key='schedule:'||NEW.id::text;
  return null;
 end if;
 select * into linked from public.relay_calendar_events where user_id=NEW.user_id and source_key='schedule:'||NEW.id::text;
 minutes:=case when NEW.estimated_minutes is distinct from OLD.estimated_minutes and NEW.estimated_minutes is not null then NEW.estimated_minutes
  else coalesce((extract(epoch from (linked.end_time-linked.start_time))/60)::integer,NEW.estimated_minutes,30) end;
 if extract(epoch from NEW.scheduled_start)/60+minutes>=1440 then raise exception 'This scheduled task crosses midnight. Choose an earlier time'; end if;
 ends:=(NEW.scheduled_start+make_interval(mins=>minutes))::time;
 if exists(select 1 from public.relay_calendar_events where user_id=NEW.user_id and event_date=NEW.scheduled_on and source_key is distinct from ('schedule:'||NEW.id::text) and (is_all_day or (start_time<ends and coalesce(end_time,start_time+interval '30 minutes')>NEW.scheduled_start))) then raise exception 'This task edit overlaps another calendar event'; end if;
 insert into public.relay_calendar_events(user_id,title,event_date,is_all_day,start_time,end_time,source_key)
 values(NEW.user_id,NEW.title,NEW.scheduled_on,false,NEW.scheduled_start,ends,'schedule:'||NEW.id::text)
 on conflict(user_id,source_key) do update set title=excluded.title,event_date=excluded.event_date,start_time=excluded.start_time,end_time=excluded.end_time,is_all_day=false,updated_at=now();
 return null;
end $$;
create trigger arrow_task_calendar_sync after update of title,estimated_minutes,scheduled_on,scheduled_start,completed or delete on public.todos for each row execute function public.arrow_sync_task_calendar();

create or replace function public.arrow_sync_calendar_task()
returns trigger language plpgsql security invoker set search_path='' as $$
declare task_id uuid; minutes integer;
begin
 if pg_trigger_depth()>1 or OLD.source_key is null or OLD.source_key !~ '^schedule:[0-9a-f-]{36}$' then return null; end if;
 task_id:=substring(OLD.source_key from 10)::uuid;
 if TG_OP='DELETE' then
  update public.todos set scheduled_on=null,scheduled_start=null,updated_at=now() where user_id=OLD.user_id and id=task_id;
 else
  if NEW.user_id<>OLD.user_id or NEW.source_key is distinct from OLD.source_key then raise exception 'A scheduled task link cannot change ownership'; end if;
  if NEW.is_all_day or NEW.start_time is null or NEW.end_time is null or NEW.end_time<=NEW.start_time then raise exception 'Scheduled tasks need a same-day start and end'; end if;
  minutes:=(extract(epoch from (NEW.end_time-NEW.start_time))/60)::integer;
  if minutes not between 5 and 720 then raise exception 'A task block must last 5 to 720 minutes'; end if;
  if exists(select 1 from public.relay_calendar_events where user_id=NEW.user_id and id<>NEW.id and event_date=NEW.event_date and (is_all_day or (start_time<NEW.end_time and coalesce(end_time,start_time+interval '30 minutes')>NEW.start_time))) then raise exception 'This calendar edit overlaps another event'; end if;
  update public.todos set title=NEW.title,scheduled_on=NEW.event_date,scheduled_start=NEW.start_time,estimated_minutes=minutes,updated_at=now() where user_id=NEW.user_id and id=task_id;
 end if;
 return null;
end $$;
create trigger arrow_calendar_task_sync after update of title,event_date,is_all_day,start_time,end_time,source_key,user_id or delete on public.relay_calendar_events for each row execute function public.arrow_sync_calendar_task();
revoke all on function public.arrow_sync_task_calendar() from public,anon,authenticated;
revoke all on function public.arrow_sync_calendar_task() from public,anon,authenticated;

