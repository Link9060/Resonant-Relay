-- Prevent custom clients from using group/plan creation as a resource-amplification path.

create or replace function public.create_group(p_name text, p_member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  caller uuid := (select auth.uid());
  new_group_id uuid;
  new_conversation_id uuid;
  member_id uuid;
  recent_hour integer;
  recent_day integer;
  raw_member_count integer := coalesce(array_length(p_member_ids, 1), 0);
begin
  if caller is null then raise exception 'not authenticated'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'group name is required'; end if;
  if char_length(trim(p_name)) > 80 then raise exception 'group name must be 80 characters or fewer'; end if;
  if raw_member_count > 50 then raise exception 'groups can add up to 50 contacts at creation'; end if;

  perform pg_advisory_xact_lock(hashtextextended('relay:create_group:' || caller::text, 0));
  select count(*) into recent_hour from public.groups where created_by = caller and created_at > now() - interval '1 hour';
  if recent_hour >= 10 then raise exception 'group creation limit reached — try again later'; end if;
  select count(*) into recent_day from public.groups where created_by = caller and created_at > now() - interval '24 hours';
  if recent_day >= 30 then raise exception 'daily group creation limit reached'; end if;

  foreach member_id in array coalesce(p_member_ids, array[]::uuid[]) loop
    if member_id is null then raise exception 'invalid group member'; end if;
    if member_id <> caller and not public.are_connected(caller, member_id) then
      raise exception 'you can only add people from your contacts';
    end if;
  end loop;

  insert into public.groups (name, created_by) values (trim(p_name), caller)
  returning id into new_group_id;
  insert into public.group_members (group_id, user_id, role) values (new_group_id, caller, 'admin');
  insert into public.conversations (type, group_id) values ('group', new_group_id)
  returning id into new_conversation_id;
  insert into public.conversation_participants (conversation_id, user_id) values (new_conversation_id, caller);

  foreach member_id in array coalesce(p_member_ids, array[]::uuid[]) loop
    if member_id <> caller then
      insert into public.group_members (group_id, user_id, role) values (new_group_id, member_id, 'member') on conflict do nothing;
      insert into public.conversation_participants (conversation_id, user_id) values (new_conversation_id, member_id) on conflict do nothing;
    end if;
  end loop;
  return new_conversation_id;
end;
$$;

create or replace function public.create_plan(p_group_id uuid, p_name text, p_notes text, p_response_type text, p_options text[], p_repeat_rule text, p_starts_on date, p_repeat_until date, p_custom_dates date[])
returns uuid
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  caller uuid := (select auth.uid());
  new_plan_id uuid;
  cursor_date date;
  occurrence_count int := 0;
  max_occurrences constant int := 26;
  open_ended_cap constant int := 8;
  option_count int := coalesce(array_length(p_options, 1), 0);
  custom_count int := coalesce(array_length(p_custom_dates, 1), 0);
  recent_hour int;
  option_label text;
begin
  if caller is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = caller) then raise exception 'you must be a member of this group to plan for it'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'plan name is required'; end if;
  if char_length(trim(p_name)) > 120 then raise exception 'plan name must be 120 characters or fewer'; end if;
  if p_notes is not null and char_length(p_notes) > 5000 then raise exception 'plan notes must be 5,000 characters or fewer'; end if;
  if p_starts_on is null then raise exception 'choose a start date'; end if;
  if p_repeat_until is not null and p_repeat_until < p_starts_on then raise exception 'repeat end date cannot be before the start date'; end if;
  if p_response_type not in ('rsvp', 'select_option') then raise exception 'invalid response type'; end if;
  if p_response_type = 'select_option' and option_count < 2 then raise exception 'give at least two options to choose between'; end if;
  if option_count > 20 then raise exception 'plans can have up to 20 options'; end if;
  foreach option_label in array coalesce(p_options, array[]::text[]) loop
    if char_length(trim(coalesce(option_label, ''))) = 0 or char_length(trim(option_label)) > 120 then raise exception 'each plan option must be 1–120 characters'; end if;
  end loop;
  if p_repeat_rule not in ('never', 'daily', 'weekly', 'custom') then raise exception 'invalid repeat rule'; end if;
  if p_repeat_rule = 'custom' and custom_count = 0 then raise exception 'pick at least one date for a custom schedule'; end if;
  if custom_count > max_occurrences then raise exception 'custom schedules can have up to 26 dates'; end if;

  perform pg_advisory_xact_lock(hashtextextended('relay:create_plan:' || caller::text, 0));
  select count(*) into recent_hour from public.plans where created_by = caller and created_at > now() - interval '1 hour';
  if recent_hour >= 30 then raise exception 'plan creation limit reached — try again later'; end if;

  insert into public.plans (group_id, created_by, name, notes, response_type, repeat_rule, starts_on, repeat_until)
  values (p_group_id, caller, trim(p_name), nullif(trim(coalesce(p_notes, '')), ''), p_response_type::public.plan_response_type, p_repeat_rule::public.plan_repeat_rule, p_starts_on, p_repeat_until)
  returning id into new_plan_id;

  if p_response_type = 'select_option' then
    for occurrence_count in 1..option_count loop
      insert into public.plan_options (plan_id, label, sort_order) values (new_plan_id, trim(p_options[occurrence_count]), occurrence_count);
    end loop;
    occurrence_count := 0;
  end if;
  if p_repeat_rule = 'never' then
    insert into public.plan_instances (plan_id, occurs_on) values (new_plan_id, p_starts_on);
  elsif p_repeat_rule = 'custom' then
    insert into public.plan_instances (plan_id, occurs_on) select new_plan_id, d from unnest(p_custom_dates) as d on conflict (plan_id, occurs_on) do nothing;
  else
    cursor_date := p_starts_on;
    while occurrence_count < max_occurrences and (p_repeat_until is null or cursor_date <= p_repeat_until) and (p_repeat_until is not null or occurrence_count < open_ended_cap) loop
      insert into public.plan_instances (plan_id, occurs_on) values (new_plan_id, cursor_date) on conflict (plan_id, occurs_on) do nothing;
      occurrence_count := occurrence_count + 1;
      cursor_date := cursor_date + (case when p_repeat_rule = 'daily' then 1 else 7 end);
    end loop;
  end if;
  return new_plan_id;
end;
$$;

create or replace function public.create_plan_v2(p_group_id uuid, p_name text, p_notes text, p_response_type text, p_options text[], p_response_prompt text, p_repeat_rule text, p_starts_on date, p_repeat_until date, p_custom_dates date[])
returns uuid
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $$
declare
  caller uuid := (select auth.uid());
  new_plan_id uuid;
  cursor_date date;
  occurrence_count int := 0;
  max_occurrences constant int := 26;
  open_ended_cap constant int := 8;
  option_count int := coalesce(array_length(p_options, 1), 0);
  custom_count int := coalesce(array_length(p_custom_dates, 1), 0);
  recent_hour int;
  option_label text;
  clean_prompt text := trim(coalesce(p_response_prompt, ''));
begin
  if caller is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.group_members where group_id = p_group_id and user_id = caller) then raise exception 'you must be a member of this group to plan for it'; end if;
  if p_name is null or char_length(trim(p_name)) = 0 then raise exception 'plan name is required'; end if;
  if char_length(trim(p_name)) > 120 then raise exception 'plan name must be 120 characters or fewer'; end if;
  if p_notes is not null and char_length(p_notes) > 5000 then raise exception 'plan notes must be 5,000 characters or fewer'; end if;
  if p_starts_on is null then raise exception 'choose a start date'; end if;
  if p_repeat_until is not null and p_repeat_until < p_starts_on then raise exception 'repeat end date cannot be before the start date'; end if;
  if p_response_type not in ('rsvp', 'select_option', 'custom_text') then raise exception 'invalid response type'; end if;
  if p_response_type = 'select_option' and option_count < 2 then raise exception 'give at least two options to choose between'; end if;
  if option_count > 20 then raise exception 'plans can have up to 20 options'; end if;
  foreach option_label in array coalesce(p_options, array[]::text[]) loop
    if char_length(trim(coalesce(option_label, ''))) = 0 or char_length(trim(option_label)) > 120 then raise exception 'each plan option must be 1–120 characters'; end if;
  end loop;
  if p_response_type = 'custom_text' and clean_prompt = '' then raise exception 'add a question for the written answer'; end if;
  if char_length(clean_prompt) > 120 then raise exception 'written-answer prompt must be 120 characters or fewer'; end if;
  if p_repeat_rule not in ('never', 'daily', 'weekly', 'custom') then raise exception 'invalid repeat rule'; end if;
  if p_repeat_rule = 'custom' and custom_count = 0 then raise exception 'pick at least one date for a custom schedule'; end if;
  if custom_count > max_occurrences then raise exception 'custom schedules can have up to 26 dates'; end if;

  perform pg_advisory_xact_lock(hashtextextended('relay:create_plan:' || caller::text, 0));
  select count(*) into recent_hour from public.plans where created_by = caller and created_at > now() - interval '1 hour';
  if recent_hour >= 30 then raise exception 'plan creation limit reached — try again later'; end if;

  insert into public.plans (group_id, created_by, name, notes, response_type, response_prompt, repeat_rule, starts_on, repeat_until)
  values (p_group_id, caller, trim(p_name), nullif(trim(coalesce(p_notes, '')), ''), p_response_type::public.plan_response_type, case when p_response_type = 'custom_text' then clean_prompt else null end, p_repeat_rule::public.plan_response_type, p_starts_on, p_repeat_until)
  returning id into new_plan_id;

  if p_response_type = 'select_option' then
    for occurrence_count in 1..option_count loop
      insert into public.plan_options (plan_id, label, sort_order) values (new_plan_id, trim(p_options[occurrence_count]), occurrence_count);
    end loop;
    occurrence_count := 0;
  end if;
  if p_repeat_rule = 'never' then
    insert into public.plan_instances (plan_id, occurs_on) values (new_plan_id, p_starts_on);
  elsif p_repeat_rule = 'custom' then
    insert into public.plan_instances (plan_id, occurs_on) select new_plan_id, d from unnest(p_custom_dates) as d on conflict (plan_id, occurs_on) do nothing;
  else
    cursor_date := p_starts_on;
    while occurrence_count < max_occurrences and (p_repeat_until is null or cursor_date <= p_repeat_until) and (p_repeat_until is not null or occurrence_count < open_ended_cap) loop
      insert into public.plan_instances (plan_id, occurs_on) values (new_plan_id, cursor_date) on conflict (plan_id, occurs_on) do nothing;
      occurrence_count := occurrence_count + 1;
      cursor_date := cursor_date + (case when p_repeat_rule = 'daily' then 1 else 7 end);
    end loop;
  end if;
  return new_plan_id;
end;
$$;
