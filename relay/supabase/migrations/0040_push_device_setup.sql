alter type public.notification_type add value if not exists 'system';

alter table public.push_subscriptions
  add column if not exists device_name text not null default 'Browser device',
  add column if not exists last_seen_at timestamptz not null default now();

comment on column public.push_subscriptions.device_name is
  'Friendly client-generated label shown in notification settings.';

comment on column public.push_subscriptions.last_seen_at is
  'Most recent time the browser confirmed and saved this subscription.';
