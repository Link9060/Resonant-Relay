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
