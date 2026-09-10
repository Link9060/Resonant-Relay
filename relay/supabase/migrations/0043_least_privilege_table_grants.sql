-- RELAY — LEAST-PRIVILEGE TABLE GRANTS
-- RLS remains the row-level boundary, but app roles should not also carry
-- unnecessary SQL privileges such as TRUNCATE, TRIGGER, or REFERENCES.

revoke all on table public.messages from anon;
revoke truncate, references, trigger on table public.messages from authenticated;

revoke all on table public.todos from anon;
revoke truncate, references, trigger on table public.todos from authenticated;

revoke all on table public.push_subscriptions from anon;
revoke truncate, references, trigger on table public.push_subscriptions from authenticated;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
drop policy if exists push_subscriptions_insert_own on public.push_subscriptions;
drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;

create policy push_subscriptions_select_own
on public.push_subscriptions for select
to authenticated
using ((select auth.uid()) = user_id);

create policy push_subscriptions_insert_own
on public.push_subscriptions for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy push_subscriptions_delete_own
on public.push_subscriptions for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Notes and support-mail migrations were deployed after some repository
-- snapshots. Apply their grant cleanup only when those tables are present.
do $$
begin
  if to_regclass('public.notes') is not null then
    execute 'revoke all on table public.notes from anon';
    execute 'revoke truncate, references, trigger on table public.notes from authenticated';
  end if;

  if to_regclass('public.support_email_messages') is not null then
    execute 'revoke all on table public.support_email_messages from anon';
    execute 'revoke insert, update, delete, truncate, references, trigger on table public.support_email_messages from authenticated';
    execute 'grant select on table public.support_email_messages to authenticated';
  end if;

  if to_regclass('public.support_email_threads') is not null then
    execute 'revoke all on table public.support_email_threads from anon';
    execute 'revoke insert, delete, truncate, references, trigger on table public.support_email_threads from authenticated';
    execute 'grant select, update on table public.support_email_threads to authenticated';
  end if;
end;
$$;
