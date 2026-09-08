-- Move the existing public anon JWT used for the database -> Edge Function
-- push dispatch hop into Supabase Vault. Extract it from the pre-existing
-- function once so the credential is not duplicated in source control.
do $$
declare
  v_definition text;
  v_token text;
begin
  if not exists (select 1 from vault.secrets where name = 'relay_push_dispatch_anon_jwt') then
    select pg_get_functiondef('private.dispatch_push_notification()'::regprocedure)
      into v_definition;
    v_token := substring(v_definition from 'Bearer ([A-Za-z0-9._-]+)');
    if v_token is not null then
      perform vault.create_secret(
        v_token,
        'relay_push_dispatch_anon_jwt',
        'Public anon JWT used only for authenticated push-dispatch Edge Function invocation',
        null
      );
    end if;
  end if;
end
$$;

create or replace function private.dispatch_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name = 'relay_push_dispatch_anon_jwt'
  limit 1;

  -- Push delivery must never make the originating Relay write fail. If the
  -- dispatch credential is unavailable, in-app notifications still exist.
  if v_token is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://cnorozrjugxpanpfmssa.supabase.co/functions/v1/push-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_token
    ),
    body := jsonb_build_object('notificationId', new.id)
  );
  return new;
end;
$$;

revoke all on function private.dispatch_push_notification() from public, anon, authenticated;
