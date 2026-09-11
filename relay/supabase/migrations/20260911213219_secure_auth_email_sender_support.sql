create table if not exists public.auth_email_rate_limits (
  id bigint generated always as identity primary key,
  email_hash text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists auth_email_rate_limits_email_created_idx
  on public.auth_email_rate_limits (email_hash, created_at desc);
create index if not exists auth_email_rate_limits_ip_created_idx
  on public.auth_email_rate_limits (ip_hash, created_at desc);

alter table public.auth_email_rate_limits enable row level security;
revoke all on public.auth_email_rate_limits from public, anon, authenticated;
grant select, insert, delete on public.auth_email_rate_limits to service_role;
grant usage, select on sequence public.auth_email_rate_limits_id_seq to service_role;

create or replace function public.request_auth_email_slot(p_email_hash text, p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  email_recent integer;
  ip_recent integer;
begin
  if coalesce(length(p_email_hash), 0) < 16 or coalesce(length(p_ip_hash), 0) < 16 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_email_hash || ':' || p_ip_hash, 0));

  delete from public.auth_email_rate_limits where created_at < now() - interval '24 hours';

  select count(*) into email_recent
  from public.auth_email_rate_limits
  where email_hash = p_email_hash
    and created_at > now() - interval '10 minutes';

  select count(*) into ip_recent
  from public.auth_email_rate_limits
  where ip_hash = p_ip_hash
    and created_at > now() - interval '1 hour';

  if email_recent >= 4 or ip_recent >= 20 then
    return false;
  end if;

  insert into public.auth_email_rate_limits (email_hash, ip_hash) values (p_email_hash, p_ip_hash);
  return true;
end;
$$;

revoke all on function public.request_auth_email_slot(text, text) from public, anon, authenticated;
grant execute on function public.request_auth_email_slot(text, text) to service_role;

create or replace function public.auth_email_user_exists(p_email text)
returns boolean
language sql
security definer
set search_path = public, auth, pg_temp
stable
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(trim(p_email))
  );
$$;

revoke all on function public.auth_email_user_exists(text) from public, anon, authenticated;
grant execute on function public.auth_email_user_exists(text) to service_role;

create or replace function public.get_relay_internal_secret(p_name text)
returns text
language sql
security definer
set search_path = public, vault, pg_temp
stable
as $$
  select decrypted_secret
  from vault.decrypted_secrets
  where name = p_name
  limit 1;
$$;

revoke all on function public.get_relay_internal_secret(text) from public, anon, authenticated;
grant execute on function public.get_relay_internal_secret(text) to service_role;
