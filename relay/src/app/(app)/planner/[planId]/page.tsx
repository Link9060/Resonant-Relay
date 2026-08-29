import { PlanHeader } from '@/components/planner/plan-header';
import { PlanInstanceCard } from '@/components/planner/plan-instance-card';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function PlanDetailPage({ params }: { params: { planId: string } }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: plan } = await supabase
    .from('plans')
    .select(
      `id, name, notes, response_type, repeat_rule, created_by, starts_on, repeat_until,
       group:groups(id, name),
       options:plan_options(id, label, sort_order),
       instances:plan_instances(id, occurs_on)`
    )
    .eq('id', params.planId)
    .single();

  if (!plan) notFound();

  const group = (plan as any).group as { id: string; name: string };
  const options = ((plan as any).options as { id: string; label: string; sort_order: number }[]).sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const instances = ((plan as any).instances as { id: string; occurs_on: string }[]).sort((a, b) =>
    a.occurs_on.localeCompare(b.occurs_on)
  );

  const [{ data: members }, { data: responses }, { data: myMembership }] = await Promise.all([
    supabase.from('group_members').select('user_id, profile:profiles(id, display_name)').eq('group_id', group.id),
    supabase
      .from('plan_responses')
      .select('id, plan_instance_id, user_id, option_id, rsvp_status')
      .in(
        'plan_instance_id',
        instances.map((i) => i.id)
      ),
    supabase.from('group_members').select('role').eq('group_id', group.id).eq('user_id', user.id).single(),
  ]);

  const groupMembers = (members ?? []).map((m: any) => m.profile).filter(Boolean) as {
    id: string;
    display_name: string;
  }[];

  const canDelete = plan.created_by === user.id || myMembership?.role === 'admin';

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <PlanHeader plan={plan as any} groupName={group.name} canDelete={canDelete} />

      <div className="mt-6 space-y-6">
        {instances.map((instance) => (
          <PlanInstanceCard
            key={instance.id}
            instance={instance}
            responseType={plan.response_type}
            options={options}
            groupMembers={groupMembers}
            responses={(responses ?? []).filter((r) => r.plan_instance_id === instance.id)}
            currentUserId={user.id}
          />
        ))}
      </div>
    </div>
  );
}
