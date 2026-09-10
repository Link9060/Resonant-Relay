alter type public.plan_response_type add value if not exists 'custom_text';

alter table public.plans
  add column if not exists response_prompt text
  check (response_prompt is null or char_length(response_prompt) between 1 and 120);

alter table public.plan_responses
  add column if not exists text_response text
  check (text_response is null or char_length(text_response) between 1 and 240);

alter table public.plan_responses drop constraint if exists exactly_one_response_shape;
alter table public.plan_responses add constraint exactly_one_response_shape check (
  ((option_id is not null)::int + (rsvp_status is not null)::int + (text_response is not null)::int) = 1
);

create or replace function public.create_plan_v2(
  p_group_id uuid,
  p_name text,
  p_notes text,
  p_response_type text,
  p_options text[],
  p_response_prompt text,
  p_repeat_rule text,
  p_starts_on date,
  p_repeat_until date,
  p_custom_dates date[]
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  new_plan_id uuid;
  cursor_date date;
  occurrence_count int := 0;
  max_occurrences constant int := 26;
  open_ended_cap constant int := 8;
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

  insert into public.plans (group_id, created_by, name, notes, response_type, response_prompt, repeat_rule, starts_on, repeat_until)
  values (
    p_group_id, auth.uid(), trim(p_name), nullif(trim(coalesce(p_notes, '')), ''),
    p_response_type::public.plan_response_type,
    case when p_response_type = 'custom_text' then left(trim(p_response_prompt), 120) else null end,
    p_repeat_rule::public.plan_repeat_rule, p_starts_on, p_repeat_until
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

revoke all on function public.create_plan_v2(uuid, text, text, text, text[], text, text, date, date, date[]) from public, anon;
grant execute on function public.create_plan_v2(uuid, text, text, text, text[], text, text, date, date, date[]) to authenticated;

create or replace function public.submit_plan_response_v2(
  p_instance_id uuid,
  p_option_id uuid default null,
  p_rsvp_status text default null,
  p_text_response text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare target_plan record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select p.id, p.group_id, p.response_type into target_plan
  from public.plan_instances pi join public.plans p on p.id = pi.plan_id
  where pi.id = p_instance_id;
  if target_plan is null then raise exception 'plan occurrence not found'; end if;
  if not exists (select 1 from public.group_members where group_id = target_plan.group_id and user_id = auth.uid()) then
    raise exception 'you are not part of this plan''s group';
  end if;

  if target_plan.response_type = 'select_option' then
    if p_option_id is null or not exists (select 1 from public.plan_options where id = p_option_id and plan_id = target_plan.id) then
      raise exception 'pick a valid option';
    end if;
    insert into public.plan_responses (plan_instance_id, user_id, option_id, rsvp_status, text_response)
    values (p_instance_id, auth.uid(), p_option_id, null, null)
    on conflict (plan_instance_id, user_id) do update
      set option_id = excluded.option_id, rsvp_status = null, text_response = null, responded_at = now();
  elsif target_plan.response_type = 'rsvp' then
    if p_rsvp_status is null or p_rsvp_status not in ('yes', 'no', 'maybe') then raise exception 'pick yes, no, or maybe'; end if;
    insert into public.plan_responses (plan_instance_id, user_id, option_id, rsvp_status, text_response)
    values (p_instance_id, auth.uid(), null, p_rsvp_status::public.rsvp_status, null)
    on conflict (plan_instance_id, user_id) do update
      set option_id = null, rsvp_status = excluded.rsvp_status, text_response = null, responded_at = now();
  else
    if char_length(trim(coalesce(p_text_response, ''))) = 0 then raise exception 'enter an answer'; end if;
    insert into public.plan_responses (plan_instance_id, user_id, option_id, rsvp_status, text_response)
    values (p_instance_id, auth.uid(), null, null, left(trim(p_text_response), 240))
    on conflict (plan_instance_id, user_id) do update
      set option_id = null, rsvp_status = null, text_response = excluded.text_response, responded_at = now();
  end if;
end;
$$;

revoke all on function public.submit_plan_response_v2(uuid, uuid, text, text) from public, anon;
grant execute on function public.submit_plan_response_v2(uuid, uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
