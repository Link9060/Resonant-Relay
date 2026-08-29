-- ============================================================================
-- RELAY — NOTIFICATIONS
-- In-app notification feed + Web Push subscriptions (the mechanism that lets
-- a browser show a real OS-level notification, e.g. in macOS Notification
-- Center, even when Relay isn't the focused tab). Run after 0001-0004, once.
-- ============================================================================

create type public.notification_type as enum (
  'connection_request',
  'connection_accepted',
  'group_added',
  'new_message',
  'plan_created',
  'plan_reminder'
);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- The persisted, in-app feed — the bell in the header reads from here.
-- Rows are only ever written by server-only code using the service-role
-- client (src/lib/notifications/*), never by a client insert: this is a
-- system writing to a user's feed on someone else's behalf (e.g. "you got a
-- connection request"), which per-row RLS checked against auth.uid() can't
-- express safely. There is deliberately no INSERT policy for
-- anon/authenticated below.
-- ----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  link text, -- relative path to open when tapped, e.g. '/planner/<id>'
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Marking read/unread is the one write a user does themselves.
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.notifications;

-- ----------------------------------------------------------------------------
-- PUSH SUBSCRIPTIONS
-- One row per browser/device the student has enabled notifications on
-- (a student on both a phone and a laptop gets two rows, and both receive
-- pushes). Unlike notifications above, these ARE safe to let a user manage
-- directly — a subscription is just "deliver pushes for MY notifications to
-- THIS one browser I'm currently using," entirely self-scoped.
-- ----------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);
