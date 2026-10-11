-- Activate an undated action without retaining a second active task representation.
create or replace function public.arrow_activate_action(p_source_key text,p_date date)
returns uuid language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=auth.uid(); item public.waypoint_items%rowtype; task_id uuid;
begin
 if owner_id is null or p_date is null then raise exception 'Choose a date and sign in'; end if;
 select * into item from public.waypoint_items where user_id=owner_id and source_key=p_source_key for update;
 if not found or item.item_type<>'task' then raise exception 'That action is unavailable'; end if;
 select id into task_id from public.todos where user_id=owner_id and source_key=p_source_key;
 if task_id is null then
  if item.status<>'active' then raise exception 'That action is no longer active'; end if;
  insert into public.todos(user_id,title,due_on,estimated_minutes,priority,depends_on,source_key)
  values(owner_id,left(item.title,120),p_date,item.duration_minutes,item.priority,item.depends_on,p_source_key) returning id into task_id;
 end if;
 update public.waypoint_items set status='archived',updated_at=now() where id=item.id and user_id=owner_id;
 return task_id;
end $$;
revoke all on function public.arrow_activate_action(text,date) from public,anon;
grant execute on function public.arrow_activate_action(text,date) to authenticated;
