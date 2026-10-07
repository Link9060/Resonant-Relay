create table if not exists private.arrow_email_challenges (
 user_id uuid primary key references auth.users(id) on delete cascade,
 email text not null, code_hash text not null, expires_at timestamptz not null, attempts integer not null default 0
);
alter table private.arrow_email_challenges enable row level security;
revoke all on private.arrow_email_challenges from public, anon, authenticated;
grant all on private.arrow_email_challenges to service_role;
create or replace function public.arrow_email_challenge(p_user uuid,p_action text,p_email text,p_hash text)
returns text language plpgsql security definer set search_path='' as $$
declare c private.arrow_email_challenges%rowtype;
begin
 if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'not authorized'; end if;
 if p_action='start' then
  insert into private.arrow_email_challenges values(p_user,p_email,p_hash,now()+interval '10 minutes',0)
  on conflict(user_id) do update set email=excluded.email,code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0;
  return 'sent';
 end if;
 select * into c from private.arrow_email_challenges where user_id=p_user for update;
 if c.user_id is null or c.expires_at<now() or c.attempts>=5 then return null; end if;
 update private.arrow_email_challenges set attempts=attempts+1 where user_id=p_user;
 if c.email=p_email and c.code_hash=p_hash then
  delete from private.arrow_email_challenges where user_id=p_user;
  return c.email;
 end if;
 return null;
end; $$;
revoke all on function public.arrow_email_challenge(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.arrow_email_challenge(uuid,text,text,text) to service_role;
