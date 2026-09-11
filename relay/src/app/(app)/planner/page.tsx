'use client';

import { NewPlanDialog } from '@/components/planner/new-plan-dialog';
import { PlanList } from '@/components/planner/plan-list';
import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

type PlannerState = {
  groups: Array<{ id: string; name: string }>;
  plans: any[];
  members: Map<string, number>;
  responses: Map<string, number>;
};

export default function PlannerPage() {
  const [state, setState] = useState<PlannerState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('You are not signed in.');

        const { data: memberships, error: membershipError } = await supabase
          .from('group_members')
          .select('group:groups(id,name)')
          .eq('user_id', user.id);
        if (membershipError) throw membershipError;

        const groups = (memberships ?? []).map((membership: any) => membership.group).filter(Boolean);
        const ids = groups.map((group: any) => group.id);

        if (!ids.length) {
          if (active) setState({ groups, plans: [], members: new Map(), responses: new Map() });
          return;
        }

        const { data: plans, error: planError } = await supabase
          .from('plans')
          .select('id,name,response_type,repeat_rule,created_at,group:groups(id,name),options:plan_options(id,label,sort_order),instances:plan_instances(id,occurs_on)')
          .in('group_id', ids)
          .order('created_at', { ascending: false });
        if (planError) throw planError;

        const instanceIds = (plans ?? []).flatMap((plan: any) => (plan.instances ?? []).map((instance: any) => instance.id));
        const [responseResult, memberResult] = await Promise.all([
          instanceIds.length
            ? supabase.from('plan_responses').select('plan_instance_id,user_id').in('plan_instance_id', instanceIds)
            : Promise.resolve({ data: [], error: null }),
          supabase.from('group_members').select('group_id,user_id').in('group_id', ids),
        ]);

        if (responseResult.error) throw responseResult.error;
        if (memberResult.error) throw memberResult.error;

        const members = new Map<string, number>();
        for (const member of memberResult.data ?? []) {
          members.set(member.group_id, (members.get(member.group_id) ?? 0) + 1);
        }

        const responses = new Map<string, number>();
        for (const response of responseResult.data ?? []) {
          responses.set(response.plan_instance_id, (responses.get(response.plan_instance_id) ?? 0) + 1);
        }

        if (active) {
          setState({ groups, plans: plans ?? [], members, responses });
          setError(null);
        }
      } catch (caught) {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : 'Planner could not load.');
        setState({ groups: [], plans: [], members: new Map(), responses: new Map() });
      }
    })();

    return () => { active = false; };
  }, []);

  if (!state) return <PageLoading />;

  return (
    <div className="relay-motion-hero-in mx-auto max-w-2xl px-4 py-8 md:px-6">
      <PageHeader title="Planner" action={state.groups.length ? <NewPlanDialog groups={state.groups} /> : undefined} />
      {error && <div className="relay-motion-row-in mt-5 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">{error}</div>}
      {state.groups.length === 0 ? (
        <div className="relay-motion-planner-empty mt-8 rounded-md border border-dashed border-border py-14 text-center">
          <p className="text-sm text-ink-muted">You need a group before you can plan anything.</p>
          <p className="mt-1 text-xs text-ink-faint">Create one from Chats, then come back here.</p>
        </div>
      ) : (
        <div className="mt-6">
          <PlanList plans={state.plans} memberCountByGroup={state.members} responseCountByInstance={state.responses} />
        </div>
      )}
    </div>
  );
}
