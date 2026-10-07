-- Passwords are managed exclusively by Supabase Auth. No password table.
create table if not exists private.arrow_auth_limits (
  bucket text primary key, attempts integer not null, window_start timestamptz not null
);
alter table private.arrow_auth_limits enable row level security;
revoke all on private.arrow_auth_limits from public, anon, authenticated;
grant all on private.arrow_auth_limits to service_role;

create or replace function public.arrow_auth_rate_limit(p_bucket text, p_limit integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'not authorized'; end if;
  insert into private.arrow_auth_limits as l values (p_bucket,1,now())
  on conflict (bucket) do update set
    attempts = case when l.window_start < now()-interval '15 minutes' then 1 else l.attempts+1 end,
    window_start = case when l.window_start < now()-interval '15 minutes' then now() else l.window_start end
  returning attempts into n;
  delete from private.arrow_auth_limits where window_start < now()-interval '1 day';
  return n <= least(greatest(p_limit,1),100);
end; $$;
revoke all on function public.arrow_auth_rate_limit(text,integer) from public, anon, authenticated;
grant execute on function public.arrow_auth_rate_limit(text,integer) to service_role;

create or replace function public.arrow_username_identity(p_username text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'not authorized'; end if;
  if private.relay_username_reserved(p_username) then return jsonb_build_object('reserved',true); end if;
  select jsonb_build_object('id',u.id,'email',u.email,'banned',p.banned_at is not null)
  into result from public.profiles p join auth.users u on u.id=p.id
  where lower(p.username)=p_username;
  return result;
end; $$;
revoke all on function public.arrow_username_identity(text) from public, anon, authenticated;
grant execute on function public.arrow_username_identity(text) to service_role;
