create or replace function public.update_plan_v1(
  p_plan_id uuid,
  p_name text,
  p_notes text,
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
  plan_creator uuid;
  cursor_date date;
  occurrence_count int := 0;
  scan_count int := 0;
  max_occurrences constant int := 52;
  open_ended_cap constant int := 12;
  target_dates date[] := '{}'::date[];
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select created_by into plan_creator
  from public.plans
  where id = p_plan_id;

  if plan_creator is null then raise exception 'plan not found'; end if;
  if plan_creator <> auth.uid() then raise exception 'only the plan creator can edit this plan'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'plan name is required'; end if;
  if p_repeat_rule not in ('never', 'daily', 'weekly', 'custom') then raise exception 'invalid repeat rule'; end if;
  if p_repeat_rule = 'custom' and coalesce(array_length(p_custom_dates, 1), 0) = 0 then
    raise exception 'pick at least one date for a custom schedule';
  end if;
  if p_repeat_until is not null and p_repeat_until < p_starts_on then
    raise exception 'end date must be on or after the start date';
  end if;
  if p_end_time is not null and p_start_time is null then raise exception 'add a start time before an end time'; end if;
  if p_start_time is not null and p_end_time is not null and p_end_time <= p_start_time then
    raise exception 'end time must be after start time';
  end if;

  if p_repeat_rule = 'never' then
    target_dates := array[p_starts_on];
  elsif p_repeat_rule = 'custom' then
    select coalesce(array_agg(distinct selected_date order by selected_date), '{}'::date[])
      into target_dates
    from unnest(p_custom_dates) as selected(selected_date);
  else
    cursor_date := p_starts_on;
    while scan_count < 5000 loop
      exit when p_repeat_until is not null and cursor_date > p_repeat_until;

      if cursor_date >= current_date then
        target_dates := array_append(target_dates, cursor_date);
        occurrence_count := occurrence_count + 1;
        exit when occurrence_count >= max_occurrences;
        exit when p_repeat_until is null and occurrence_count >= open_ended_cap;
      end if;

      cursor_date := cursor_date + (case when p_repeat_rule = 'daily' then 1 else 7 end);
      scan_count := scan_count + 1;
    end loop;
  end if;

  update public.plans
  set name = trim(p_name),
      notes = nullif(trim(coalesce(p_notes, '')), ''),
      repeat_rule = p_repeat_rule::public.plan_repeat_rule,
      starts_on = p_starts_on,
      repeat_until = case when p_repeat_rule in ('daily', 'weekly') then p_repeat_until else null end,
      start_time = p_start_time,
      end_time = case when p_start_time is null then null else p_end_time end
  where id = p_plan_id;

  delete from public.plan_instances instance
  where instance.plan_id = p_plan_id
    and instance.occurs_on >= current_date
    and not (instance.occurs_on = any(target_dates));

  insert into public.plan_instances (plan_id, occurs_on)
  select p_plan_id, selected_date
  from unnest(target_dates) as selected(selected_date)
  where selected_date >= current_date
  on conflict (plan_id, occurs_on) do nothing;

  return p_plan_id;
end;
$$;

revoke all on function public.update_plan_v1(uuid, text, text, text, date, date, date[], time without time zone, time without time zone) from public, anon;
grant execute on function public.update_plan_v1(uuid, text, text, text, date, date, date[], time without time zone, time without time zone) to authenticated;

notify pgrst, 'reload schema';
