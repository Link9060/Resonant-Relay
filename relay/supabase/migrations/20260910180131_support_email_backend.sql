create table if not exists public.support_email_config (
  id smallint primary key default 1 check (id = 1),
  resend_api_key text not null,
  resend_webhook_secret text not null,
  support_address text not null default 'support@resonantrelay.org',
  updated_at timestamptz not null default now()
);

alter table public.support_email_config enable row level security;
revoke all on table public.support_email_config from anon, authenticated;
grant select on table public.support_email_config to service_role;

create table if not exists public.support_email_threads (
  id uuid primary key default gen_random_uuid(),
  sender_email text not null,
  sender_name text,
  subject text not null default '(No subject)',
  status text not null default 'new' check (status in ('new','open','pending','closed')),
  assigned_to uuid references public.profiles(id) on delete set null,
  latest_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_email_threads_latest_idx on public.support_email_threads(latest_message_at desc);
create index if not exists support_email_threads_sender_idx on public.support_email_threads(lower(sender_email));

create table if not exists public.support_email_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.support_email_threads(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound')),
  resend_email_id text unique,
  message_id text,
  in_reply_to text,
  from_email text not null,
  to_emails text[] not null default '{}',
  subject text not null default '(No subject)',
  text_body text,
  html_body text,
  headers jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  sent_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists support_email_messages_thread_idx on public.support_email_messages(thread_id, created_at);
create index if not exists support_email_messages_message_id_idx on public.support_email_messages(message_id);

alter table public.support_email_threads enable row level security;
alter table public.support_email_messages enable row level security;

grant select, update on public.support_email_threads to authenticated;
grant select on public.support_email_messages to authenticated;

create policy "staff can read support email threads" on public.support_email_threads
for select to authenticated using (public.current_app_role() in ('moderator','admin','owner'));

create policy "admin owner can update support email threads" on public.support_email_threads
for update to authenticated using (public.current_app_role() in ('admin','owner'))
with check (public.current_app_role() in ('admin','owner'));

create policy "staff can read support email messages" on public.support_email_messages
for select to authenticated using (public.current_app_role() in ('moderator','admin','owner'));

create or replace function public.staff_update_support_thread(
  p_thread_id uuid,
  p_status text default null,
  p_assigned_to uuid default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() not in ('admin','owner') then
    raise exception 'Not authorized';
  end if;
  if p_status is not null and p_status not in ('new','open','pending','closed') then
    raise exception 'Invalid status';
  end if;
  update public.support_email_threads
  set status = coalesce(p_status, status),
      assigned_to = coalesce(p_assigned_to, assigned_to),
      updated_at = now()
  where id = p_thread_id;
end;
$$;

revoke all on function public.staff_update_support_thread(uuid,text,uuid) from public;
grant execute on function public.staff_update_support_thread(uuid,text,uuid) to authenticated;
