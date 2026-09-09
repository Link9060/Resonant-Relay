create table if not exists public.push_delivery_config (
  id smallint primary key check (id = 1),
  public_key text not null,
  private_key text not null,
  subject text not null,
  created_at timestamptz not null default now()
);

alter table public.push_delivery_config enable row level security;
revoke all on table public.push_delivery_config from anon, authenticated;

comment on table public.push_delivery_config is
  'Server-only Web Push signing material. No client role has table privileges or an RLS policy.';
