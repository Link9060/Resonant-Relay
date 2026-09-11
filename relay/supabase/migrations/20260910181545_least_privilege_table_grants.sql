-- Anonymous visitors do not need direct table access to private Relay data.
revoke all on table public.messages from anon;
revoke all on table public.notes from anon;
revoke all on table public.todos from anon;
revoke all on table public.push_subscriptions from anon;
revoke all on table public.support_email_threads from anon;
revoke all on table public.support_email_messages from anon;

-- Authenticated application users only need CRUD, not schema/SQL administration privileges.
revoke truncate, references, trigger on table public.messages from authenticated;
revoke truncate, references, trigger on table public.notes from authenticated;
revoke truncate, references, trigger on table public.todos from authenticated;
revoke truncate, references, trigger on table public.push_subscriptions from authenticated;

-- Support mail is server-written. Staff may read messages; admins/owners may
-- update thread workflow state under RLS / RPC checks.
revoke insert, update, delete, truncate, references, trigger on table public.support_email_messages from authenticated;
grant select on table public.support_email_messages to authenticated;

revoke insert, delete, truncate, references, trigger on table public.support_email_threads from authenticated;
grant select, update on table public.support_email_threads to authenticated;

-- Make push-subscription policy intent explicit instead of relying on auth.uid()
-- evaluating to NULL for anonymous requests.
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
