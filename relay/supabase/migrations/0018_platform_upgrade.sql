-- RELAY — CHAT ATTACHMENTS, MULTI-ACCOUNT MAIL, AND PUSH DELIVERY

-- Private chat attachments. Objects are always addressed through short-lived
-- signed URLs and are visible only to conversation participants.
alter table public.messages add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table public.messages drop constraint if exists messages_body_check;
alter table public.messages add constraint messages_body_check check (
  char_length(body) <= 4000
  and (char_length(body) >= 1 or jsonb_array_length(attachments) >= 1)
  and jsonb_typeof(attachments) = 'array'
  and jsonb_array_length(attachments) <= 5
);

revoke insert on public.messages from authenticated;
grant insert (conversation_id, sender_id, body, attachments) on public.messages to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  10485760,
  array[
    'image/jpeg','image/png','image/gif','image/webp','image/heic','image/heif',
    'application/pdf','text/plain','text/csv','application/zip',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Conversation members can read attachments" on storage.objects;
create policy "Conversation members can read attachments"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-attachments'
  and private.can_access_conversation(((storage.foldername(name))[1])::uuid, (select auth.uid()))
);

drop policy if exists "Conversation members can upload attachments" on storage.objects;
create policy "Conversation members can upload attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and private.can_access_conversation(((storage.foldername(name))[1])::uuid, (select auth.uid()))
);

drop policy if exists "Uploaders can delete attachments" on storage.objects;
create policy "Uploaders can delete attachments"
on storage.objects for delete to authenticated
using (
  bucket_id = 'chat-attachments'
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

-- Email connections are private server-owned credentials. Relay can connect a
-- mix of up to three Google and Microsoft inboxes per user.
create table if not exists public.email_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')),
  provider_account_id text not null,
  email_address text not null,
  display_name text,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  granted_scope text not null default '',
  connected_at timestamptz not null default now(),
  unique (user_id, provider, provider_account_id)
);

create index if not exists email_integrations_user_idx on public.email_integrations(user_id, connected_at);
alter table public.email_integrations enable row level security;
revoke all on public.email_integrations from anon, authenticated;
grant all on public.email_integrations to service_role;

insert into public.email_integrations (
  user_id, provider, provider_account_id, email_address, display_name,
  refresh_token, access_token, access_token_expires_at, granted_scope, connected_at
)
select user_id, 'google', 'legacy:' || id::text, 'Google account', 'Google account',
  refresh_token, access_token, access_token_expires_at, granted_scope, connected_at
from public.google_integrations
where service = 'gmail'
on conflict do nothing;

create table if not exists public.email_oauth_states (
  state_hash text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('google','microsoft')),
  code_verifier text not null,
  expires_at timestamptz not null
);
alter table public.email_oauth_states enable row level security;
revoke all on public.email_oauth_states from anon, authenticated;
grant all on public.email_oauth_states to service_role;

create or replace function private.enforce_email_account_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.email_integrations where user_id = new.user_id) >= 3
    and not exists (select 1 from public.email_integrations where user_id = new.user_id and provider = new.provider and provider_account_id = new.provider_account_id) then
    raise exception 'Relay supports up to three connected email accounts.';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_email_account_limit on public.email_integrations;
create trigger enforce_email_account_limit
before insert on public.email_integrations
for each row execute function private.enforce_email_account_limit();

-- The dashboard and bell receive the same UPDATE event whenever any surface
-- marks a notification read. pushed_at is server-owned delivery bookkeeping.
alter table public.notifications add column if not exists pushed_at timestamptz;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid()
  ) then raise exception 'Not a conversation participant'; end if;

  update public.conversation_participants
    set last_read_at = now()
    where conversation_id = p_conversation_id and user_id = auth.uid();
  update public.notifications
    set read_at = coalesce(read_at, now())
    where user_id = auth.uid()
      and link = '/chats/' || p_conversation_id::text
      and read_at is null;
end;
$$;
revoke all on function public.mark_conversation_read(uuid) from public;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = 'public' as $$
declare sender_name text; conversation_row record; group_name text; notification_title text; notification_body text; preview text;
begin
  select display_name into sender_name from public.profiles where id = new.sender_id;
  select * into conversation_row from public.conversations where id = new.conversation_id;
  if conversation_row.type = 'group' then select name into group_name from public.groups where id = conversation_row.group_id; end if;
  preview := case when char_length(new.body) > 0 then left(new.body,80) when jsonb_array_length(new.attachments) = 1 then 'Sent an attachment' else 'Sent attachments' end;
  notification_title := case when conversation_row.type = 'group' then coalesce(group_name,'Group') else coalesce(sender_name,'Someone') end;
  notification_body := case when conversation_row.type = 'group' then coalesce(sender_name,'Someone') || ': ' || preview else preview end;
  insert into public.notifications(user_id,type,title,body,link)
  select cp.user_id,'new_message',notification_title,notification_body,'/chats/' || new.conversation_id::text
  from public.conversation_participants cp where cp.conversation_id = new.conversation_id and cp.user_id <> new.sender_id;
  return new;
end;
$$;

create extension if not exists pg_net with schema extensions;

create or replace function private.dispatch_push_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(
    url := 'https://cnorozrjugxpanpfmssa.supabase.co/functions/v1/push-dispatch',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNub3JvenJqdWd4cGFucGZtc3NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzY5NjksImV4cCI6MjEwMzYxMjk2OX0.KD85iR9G8gAXY9QrXqyGiyzvOMz5NYoqTrmGvX5LRr4'
    ),
    body := jsonb_build_object('notificationId',new.id)
  );
  return new;
end;
$$;

drop trigger if exists dispatch_push_notification on public.notifications;
create trigger dispatch_push_notification
after insert on public.notifications
for each row execute function private.dispatch_push_notification();

notify pgrst, 'reload schema';
