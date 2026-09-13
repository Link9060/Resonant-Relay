alter table public.plans
  add column if not exists start_time time without time zone,
  add column if not exists end_time time without time zone;

alter table public.plans drop constraint if exists plan_time_order;
alter table public.plans add constraint plan_time_order check (
  end_time is null or (start_time is not null and end_time > start_time)
);

create or replace function public.create_plan_v3(
  p_group_id uuid,
  p_name text,
  p_notes text,
  p_response_type text,
  p_options text[],
  p_response_prompt text,
  p_repeat_rule text,
  p_starts_on date,
  p_repeat_until date,
  p_custom_dates date[],
  p_start_time time without time zone default null,
  p_end_time time without time zone default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_plan_id uuid;
  cursor_date date;
  occurrence_count int := 0;
  max_occurrences constant int := 52;
  open_ended_cap constant int := 12;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = auth.uid()) then
    raise exception 'you must be a member of this group to plan for it';
  end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'plan name is required'; end if;
  if p_response_type not in ('rsvp', 'select_option', 'custom_text') then raise exception 'invalid response type'; end if;
  if p_response_type = 'select_option' and coalesce(array_length(p_options, 1), 0) < 2 then
    raise exception 'give at least two options to choose between';
  end if;
  if p_response_type = 'custom_text' and char_length(trim(coalesce(p_response_prompt, ''))) = 0 then
    raise exception 'add a question for the written answer';
  end if;
  if p_repeat_rule not in ('never', 'daily', 'weekly', 'custom') then raise exception 'invalid repeat rule'; end if;
  if p_repeat_rule = 'custom' and coalesce(array_length(p_custom_dates, 1), 0) = 0 then
    raise exception 'pick at least one date for a custom schedule';
  end if;
  if p_end_time is not null and p_start_time is null then raise exception 'add a start time before an end time'; end if;
  if p_start_time is not null and p_end_time is not null and p_end_time <= p_start_time then
    raise exception 'end time must be after start time';
  end if;

  insert into public.plans (
    group_id, created_by, name, notes, response_type, response_prompt,
    repeat_rule, starts_on, repeat_until, start_time, end_time
  ) values (
    p_group_id, auth.uid(), trim(p_name), nullif(trim(coalesce(p_notes, '')), ''),
    p_response_type::public.plan_response_type,
    case when p_response_type = 'custom_text' then left(trim(p_response_prompt), 120) else null end,
    p_repeat_rule::public.plan_repeat_rule, p_starts_on, p_repeat_until, p_start_time, p_end_time
  ) returning id into new_plan_id;

  if p_response_type = 'select_option' then
    for occurrence_count in 1..array_length(p_options, 1) loop
      insert into public.plan_options (plan_id, label, sort_order)
      values (new_plan_id, trim(p_options[occurrence_count]), occurrence_count);
    end loop;
    occurrence_count := 0;
  end if;

  if p_repeat_rule = 'never' then
    insert into public.plan_instances (plan_id, occurs_on) values (new_plan_id, p_starts_on);
  elsif p_repeat_rule = 'custom' then
    insert into public.plan_instances (plan_id, occurs_on)
    select new_plan_id, d from unnest(p_custom_dates) as d
    on conflict (plan_id, occurs_on) do nothing;
  else
    cursor_date := p_starts_on;
    while occurrence_count < max_occurrences
      and (p_repeat_until is null or cursor_date <= p_repeat_until)
      and (p_repeat_until is not null or occurrence_count < open_ended_cap)
    loop
      insert into public.plan_instances (plan_id, occurs_on) values (new_plan_id, cursor_date)
      on conflict (plan_id, occurs_on) do nothing;
      occurrence_count := occurrence_count + 1;
      cursor_date := cursor_date + (case when p_repeat_rule = 'daily' then 1 else 7 end);
    end loop;
  end if;

  return new_plan_id;
end;
$$;

revoke all on function public.create_plan_v3(uuid, text, text, text, text[], text, text, date, date, date[], time without time zone, time without time zone) from public, anon;
grant execute on function public.create_plan_v3(uuid, text, text, text, text[], text, text, date, date, date[], time without time zone, time without time zone) to authenticated;

notify pgrst, 'reload schema';