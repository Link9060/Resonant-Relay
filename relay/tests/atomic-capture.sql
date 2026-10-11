begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.waypoint_captures where source_key like 'capture:%' order by created_at desc limit 1),true);
set local role authenticated;
do $$
declare owner_id uuid:=auth.uid(); capture uuid; task_id uuid; result jsonb; amount integer; saved_end time;
begin
 insert into public.waypoint_captures(user_id,source_key,raw_input,summary,source) values(owner_id,'test:'||gen_random_uuid(),'Transactional fixture','Fixture','local') returning id into capture;
 result:=public.arrow_apply_capture(capture,'[{"id":"fixture-task","title":"ARROW fixture task","type":"task","placement":"today","date":"2026-10-12","duration_minutes":20},{"id":"fixture-event","title":"ARROW fixture shift","type":"event","placement":"calendar","date":"2026-10-12","time":"16:00","duration_minutes":120},{"id":"fixture-future","title":"ARROW fixture future","type":"task","placement":"plans","date":null},{"id":"fixture-note","title":"ARROW fixture note","type":"note","placement":"notes","context":"Keep this"}]'::jsonb);
 select end_time into saved_end from public.relay_calendar_events where user_id=owner_id and source_key='waypoint:fixture-event';
 if saved_end <> '18:00'::time then raise exception 'Duration failed'; end if;
 if exists(select 1 from public.todos where user_id=owner_id and source_key='waypoint:fixture-future') then raise exception 'Undated future became deadline'; end if;
 if not exists(select 1 from public.waypoint_items where user_id=owner_id and source_key='waypoint:fixture-future' and due_date is null) then raise exception 'Future missing'; end if;
 result:=public.arrow_apply_capture(capture,'[{"id":"fixture-task","title":"Duplicate","type":"task","date":"2026-10-12"}]'::jsonb);
 if not (result->>'already_applied')::boolean then raise exception 'Retry not idempotent'; end if;
 select id into task_id from public.todos where user_id=owner_id and source_key='waypoint:fixture-task';
 perform public.arrow_schedule_task(task_id,'2026-12-30','06:00','06:20');
 if not exists(select 1 from public.todos where id=task_id and scheduled_on='2026-12-30') then raise exception 'Task schedule missing'; end if;
 if not exists(select 1 from public.relay_calendar_events where user_id=owner_id and source_key='schedule:'||task_id::text and end_time='06:20') then raise exception 'Calendar schedule missing'; end if;
 begin
  perform public.arrow_schedule_task(task_id,'2026-10-12','16:30','17:00');
  raise exception 'Collision was accepted';
 exception when others then if sqlerrm='Collision was accepted' then raise; end if; end;
 insert into public.waypoint_captures(user_id,source_key,raw_input,summary,source) values(owner_id,'test:'||gen_random_uuid(),'Invalid fixture','Fixture','local') returning id into capture;
 begin
  perform public.arrow_apply_capture(capture,'[{"id":"should-rollback","title":"Rollback task","type":"task","date":"2026-10-12"},{"id":"invalid-event","title":"Invalid event","type":"event","date":null}]'::jsonb);
  raise exception 'Invalid batch accepted';
 exception when others then if sqlerrm='Invalid batch accepted' then raise; end if; end;
 if exists(select 1 from public.todos where user_id=owner_id and source_key='waypoint:should-rollback') then raise exception 'Partial save persisted'; end if;
 begin
  perform public.arrow_apply_capture(gen_random_uuid(),'[{"id":"wrong","title":"Wrong account","type":"task","date":"2026-10-12"}]'::jsonb);
  raise exception 'Ownership check failed';
 exception when others then if sqlerrm='Ownership check failed' then raise; end if; end;
end $$;
select 'Duration, future placement, retry idempotency, schedule sync, collision rejection, rollback and ownership passed' as checks;
rollback;
