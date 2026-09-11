-- Preserve the existing access rules while evaluating auth.uid() once per query
-- instead of once per row. This is the Supabase-recommended initplan form.
alter policy connections_select_participant
on public.connections
using (((select auth.uid()) = user_a) or ((select auth.uid()) = user_b));

alter policy group_members_delete_self
on public.group_members
using ((select auth.uid()) = user_id);

alter policy participants_delete_self
on public.conversation_participants
using ((select auth.uid()) = user_id);

alter policy participants_update_own_read_state
on public.conversation_participants
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

alter policy plans_select_group_member
on public.plans
using (exists (
  select 1
  from public.group_members gm
  where gm.group_id = plans.group_id
    and gm.user_id = (select auth.uid())
));

alter policy plan_options_select_group_member
on public.plan_options
using (exists (
  select 1
  from public.plans p
  join public.group_members gm on gm.group_id = p.group_id
  where p.id = plan_options.plan_id
    and gm.user_id = (select auth.uid())
));

alter policy plan_instances_select_group_member
on public.plan_instances
using (exists (
  select 1
  from public.plans p
  join public.group_members gm on gm.group_id = p.group_id
  where p.id = plan_instances.plan_id
    and gm.user_id = (select auth.uid())
));

alter policy plan_responses_select_group_member
on public.plan_responses
using (exists (
  select 1
  from public.plan_instances pi
  join public.plans p on p.id = pi.plan_id
  join public.group_members gm on gm.group_id = p.group_id
  where pi.id = plan_responses.plan_instance_id
    and gm.user_id = (select auth.uid())
));

alter policy notifications_select_own
on public.notifications
using ((select auth.uid()) = user_id);

alter policy notifications_update_own
on public.notifications
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
