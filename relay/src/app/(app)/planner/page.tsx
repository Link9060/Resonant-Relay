import { NewPlanDialog } from '@/components/planner/new-plan-dialog';
import { PlanList } from '@/components/planner/plan-list';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export default async function PlannerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group:groups(id, name)')
    .eq('user_id', user.id);

  const groups = (memberships ?? []).map((m: any) => m.group).filter(Boolean);
  const groupIds = groups.map((g: any) => g.id);

  if (groupIds.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <PageHeader title="Planner" />
        <div className="mt-8 rounded-md border border-dashed border-border py-14 text-center">
          <p className="text-sm text-ink-muted">You need a group before you can plan anything.</p>
          <p className="mt-1 text-xs text-ink-faint">Create one from Chats, then come back here.</p>
        </div>
      </div>
    );
  }

  const { data: plans } = await supabase
    .from('plans')
    .select(
      `id, name, response_type, repeat_rule, created_at,
       group:groups(id, name),
       options:plan_options(id, label, sort_order),
       instances:plan_instances(id, occurs_on)`
    )
    .in('group_id', groupIds)
    .order('created_at', { ascending: false });

  const instanceIds = (plans ?? []).flatMap((p: any) => p.instances.map((i: any) => i.id));
  const { data: responses } = instanceIds.length
    ? await supabase.from('plan_responses').select('plan_instance_id, user_id').in('plan_instance_id', instanceIds)
    : { data: [] };

  const { data: allMembers } = await supabase.from('group_members').select('group_id, user_id').in('group_id', groupIds);

  const memberCountByGroup = new Map<string, number>();
  for (const m of allMembers ?? []) {
    memberCountByGroup.set(m.group_id, (memberCountByGroup.get(m.group_id) ?? 0) + 1);
  }

  const responseCountByInstance = new Map<string, number>();
  for (const r of responses ?? []) {
    responseCountByInstance.set(r.plan_instance_id, (responseCountByInstance.get(r.plan_instance_id) ?? 0) + 1);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <PageHeader title="Planner" action={<NewPlanDialog groups={groups} />} />

      <div className="mt-6">
        <PlanList
          plans={plans ?? []}
          memberCountByGroup={memberCountByGroup}
          responseCountByInstance={responseCountByInstance}
        />
      </div>
    </div>
  );
}
