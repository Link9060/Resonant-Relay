-- Browser clients on GitHub Pages use the Data API. RLS remains the
-- authorization boundary; these grants only make the API surface reachable.
grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.connections to authenticated;
grant select, insert, update on public.connection_requests to authenticated;
grant select on public.groups to authenticated;
grant select, delete on public.group_members to authenticated;
grant select on public.conversations to authenticated;
grant select, update, delete on public.conversation_participants to authenticated;
grant select, insert, delete on public.messages to authenticated;
grant select on public.plans, public.plan_options, public.plan_instances, public.plan_responses to authenticated;
grant select, update on public.notifications to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

-- System notifications are created inside Postgres so the browser never
-- needs a service-role key and can never forge notifications for other users.
create or replace function public.notify_connection_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare sender_name text;
begin
  select display_name into sender_name from public.profiles where id = new.sender_id;
  insert into public.notifications(user_id,type,title,body,link)
  values(new.recipient_id,'connection_request','New connection request',coalesce(sender_name,'Someone') || ' wants to connect.','/contacts');
  return new;
end; $$;

create trigger connection_request_notification
after insert on public.connection_requests
for each row execute function public.notify_connection_request();

create or replace function public.notify_connection_accepted()
returns trigger language plpgsql security definer set search_path = public as $$
declare accepter_name text;
begin
  if old.status = 'pending' and new.status = 'accepted' then
    select display_name into accepter_name from public.profiles where id = new.recipient_id;
    insert into public.notifications(user_id,type,title,body,link)
    values(new.sender_id,'connection_accepted','Connection accepted',coalesce(accepter_name,'Someone') || ' accepted your request.','/contacts');
  end if;
  return new;
end; $$;

create trigger connection_accepted_notification
after update of status on public.connection_requests
for each row execute function public.notify_connection_accepted();

create or replace function public.notify_group_member_added()
returns trigger language plpgsql security definer set search_path = public as $$
declare group_row record; creator_name text; conversation_id uuid;
begin
  select * into group_row from public.groups where id = new.group_id;
  if new.user_id = group_row.created_by then return new; end if;
  select display_name into creator_name from public.profiles where id = group_row.created_by;
  select id into conversation_id from public.conversations where group_id = new.group_id;
  insert into public.notifications(user_id,type,title,body,link)
  values(new.user_id,'group_added','Added to a group',coalesce(creator_name,'Someone') || ' added you to "' || group_row.name || '".','/chats/' || conversation_id::text);
  return new;
end; $$;

create trigger group_member_added_notification
after insert on public.group_members
for each row execute function public.notify_group_member_added();

create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
declare sender_name text; conversation_row record; group_name text; notification_title text; notification_body text;
begin
  select display_name into sender_name from public.profiles where id = new.sender_id;
  select * into conversation_row from public.conversations where id = new.conversation_id;
  if conversation_row.type = 'group' then select name into group_name from public.groups where id = conversation_row.group_id; end if;
  notification_title := case when conversation_row.type = 'group' then coalesce(group_name,'Group') else coalesce(sender_name,'Someone') end;
  notification_body := case when conversation_row.type = 'group' then coalesce(sender_name,'Someone') || ': ' || left(new.body,80) else left(new.body,80) end;
  insert into public.notifications(user_id,type,title,body,link)
  select cp.user_id,'new_message',notification_title,notification_body,'/chats/' || new.conversation_id::text
  from public.conversation_participants cp where cp.conversation_id = new.conversation_id and cp.user_id <> new.sender_id;
  return new;
end; $$;

create trigger new_message_notification
after insert on public.messages
for each row execute function public.notify_new_message();

create or replace function public.notify_plan_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare creator_name text;
begin
  select display_name into creator_name from public.profiles where id = new.created_by;
  insert into public.notifications(user_id,type,title,body,link)
  select gm.user_id,'plan_created','New plan',coalesce(creator_name,'Someone') || ' created "' || new.name || '".','/planner/' || new.id::text
  from public.group_members gm where gm.group_id = new.group_id and gm.user_id <> new.created_by;
  return new;
end; $$;

create trigger plan_created_notification
after insert on public.plans
for each row execute function public.notify_plan_created();

create or replace function public.create_plan_reminders()
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(user_id,type,title,body,link)
  select gm.user_id,'plan_reminder','Plan reminder',p.name || ' is coming up — add your response.','/planner/' || p.id::text
  from public.plan_instances pi
  join public.plans p on p.id = pi.plan_id
  join public.group_members gm on gm.group_id = p.group_id
  left join public.plan_responses pr on pr.plan_instance_id = pi.id and pr.user_id = gm.user_id
  where pi.occurs_on between current_date and current_date + 1
    and pr.id is null
    and not exists (
      select 1 from public.notifications n
      where n.user_id = gm.user_id and n.type = 'plan_reminder'
        and n.link = '/planner/' || p.id::text and n.created_at::date = current_date
    );
$$;

revoke all on function public.create_plan_reminders() from public, anon, authenticated;
