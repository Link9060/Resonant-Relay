-- RELAY — SECURE PUSH DISPATCH
-- The database-triggered push path must not be invokable by an arbitrary
-- browser/client. Keep a random dispatch secret in the server-only push config
-- row and send it to the Edge Function on each trigger invocation.
--
-- The push-dispatch Edge Function intentionally uses custom per-action auth:
--   * health: public metadata only (VAPID public key)
--   * test: validates the caller's Supabase user access token
--   * notification dispatch: validates X-Relay-Dispatch-Secret
-- Deploy that function with gateway JWT verification disabled so pg_net does
-- not need an API credential embedded in SQL.

-- Some production environments received push_delivery_config ahead of the
-- numbered repository migrations. Create it here too so a fresh database can
-- apply this migration safely.
create table if not exists public.push_delivery_config (
  id smallint primary key,
  public_key text not null,
  private_key text not null,
  subject text not null,
  created_at timestamptz not null default now()
);

alter table public.push_delivery_config enable row level security;

alter table public.push_delivery_config
  add column if not exists dispatch_secret text;

update public.push_delivery_config
set dispatch_secret = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
where dispatch_secret is null or length(dispatch_secret) < 32;

alter table public.push_delivery_config
  alter column dispatch_secret set not null;

revoke all on table public.push_delivery_config from anon, authenticated;
grant all on table public.push_delivery_config to service_role;

create or replace function private.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dispatch_secret text;
begin
  select c.dispatch_secret
  into v_dispatch_secret
  from public.push_delivery_config c
  where c.id = 1;

  if v_dispatch_secret is null then
    raise warning 'Relay push dispatch secret is unavailable';
    return new;
  end if;

  perform net.http_post(
    url := 'https://cnorozrjugxpanpfmssa.supabase.co/functions/v1/push-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Relay-Dispatch-Secret', v_dispatch_secret
    ),
    body := jsonb_build_object('notificationId', new.id)
  );
  return new;
end;
$$;

revoke all on function private.dispatch_push_notification() from public, anon, authenticated;
