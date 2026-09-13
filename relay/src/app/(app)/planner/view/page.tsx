'use client';

import { PageLoading } from '@/components/page-loading';
import { PlanHeader } from '@/components/planner/plan-header';
import { PlanInstanceCard } from '@/components/planner/plan-instance-card';
import { localDateKey } from '@/lib/date';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

type Instance = { id: string; occurs_on: string };

type PlanState = {
  plan: any;
  group: { id: string; name: string };
  instances: Instance[];
  options: any[];
  members: any[];
  responses: any[];
  userId: string;
  canDelete: boolean;
  error?: string;
};

function PlanView() {
  const params = useSearchParams();
  const id = params.get('id');
  const [state, setState] = useState<PlanState | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;

    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      const { data: plan } = await supabase
        .from('plans')
        .select('id,name,notes,response_type,response_prompt,repeat_rule,created_by,starts_on,repeat_until,start_time,end_time,group:groups(id,name),options:plan_options(id,label,sort_order),instances:plan_instances(id,occurs_on)')
        .eq('id', id)
        .single();

      if (!plan) {
        setState({ error: 'Plan not found.' } as PlanState);
        return;
      }

      const group = (plan as any).group;
      const allInstances = [...((plan as any).instances ?? [])].sort((a: Instance, b: Instance) => a.occurs_on.localeCompare(b.occurs_on));
      const today = localDateKey();
      const upcomingInstances = allInstances.filter((instance: Instance) => instance.occurs_on >= today);
      const instanceIds = upcomingInstances.map((instance: Instance) => instance.id);

      const [{ data: members }, responseResult, { data: membership }] = await Promise.all([
        supabase.from('group_members').select('user_id,profile:profiles(id,display_name)').eq('group_id', group.id),
        instanceIds.length
          ? supabase.from('plan_responses').select('id,plan_instance_id,user_id,option_id,rsvp_status,text_response').in('plan_instance_id', instanceIds)
          : Promise.resolve({ data: [] }),
        supabase.from('group_members').select('role').eq('group_id', group.id).eq('user_id', user.id).single(),
      ]);

      if (!active) return;
      setState({
        plan,
        group,
        instances: upcomingInstances,
        options: [...((plan as any).options ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order),
        members: (members ?? []).map((member: any) => member.profile).filter(Boolean),
        responses: responseResult.data ?? [],
        userId: user.id,
        canDelete: plan.created_by === user.id || membership?.role === 'admin',
      });
      setSelectedInstanceId(upcomingInstances[0]?.id ?? null);
    })();

    return () => { active = false; };
  }, [id]);

  const selectedInstance = useMemo(
    () => state?.instances.find((instance) => instance.id === selectedInstanceId) ?? state?.instances[0] ?? null,
    [selectedInstanceId, state],
  );

  if (!id) return <p className="p-8 text-sm text-red-500">Missing plan.</p>;
  if (!state) return <PageLoading />;
  if (state.error) return <p className="p-8 text-sm text-red-500">{state.error}</p>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <PlanHeader plan={state.plan} groupName={state.group.name} canDelete={state.canDelete} />

      {state.instances.length === 0 ? (
        <div className="mt-7 rounded-2xl border border-dashed border-border bg-surface/40 px-5 py-10 text-center">
          <CalendarDays size={22} className="mx-auto text-ink-faint" />
          <p className="mt-3 text-sm font-medium text-ink">No upcoming days</p>
          <p className="mt-1 text-xs text-ink-faint">Past occurrences are automatically cleared from the active planner view.</p>
        </div>
      ) : (
        <>
          <section className="mt-7 rounded-2xl border border-border bg-surface/45 p-3">
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-ink-faint">Upcoming day</p>
                <p className="mt-0.5 text-xs text-ink-muted">{state.instances.length} upcoming {state.instances.length === 1 ? 'occurrence' : 'occurrences'} · past days stay out of the way</p>
              </div>
              <ChevronDown size={15} className="text-ink-faint" />
            </div>
            <select
              value={selectedInstance?.id ?? ''}
              onChange={(event) => setSelectedInstanceId(event.target.value)}
              className="min-h-11 w-full rounded-xl border border-border bg-canvas px-3 text-sm font-medium text-ink outline-none focus-visible:border-ink-muted"
            >
              {state.instances.map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {formatOccurrence(instance.occurs_on, state.plan.start_time, state.plan.end_time)}
                </option>
              ))}
            </select>
          </section>

          {selectedInstance && (
            <div className="mt-4">
              <PlanInstanceCard
                key={selectedInstance.id}
                instance={selectedInstance}
                startTime={state.plan.start_time}
                endTime={state.plan.end_time}
                responseType={state.plan.response_type}
                responsePrompt={state.plan.response_prompt}
                options={state.options}
                groupMembers={state.members}
                responses={state.responses.filter((response: any) => response.plan_instance_id === selectedInstance.id)}
                currentUserId={state.userId}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PlanDetailPage() {
  return <Suspense fallback={<PageLoading />}><PlanView /></Suspense>;
}

function formatOccurrence(date: string, startTime?: string | null, endTime?: string | null) {
  const dateLabel = new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  if (!startTime) return `${dateLabel} · All day`;
  const start = formatTime(startTime);
  return `${dateLabel} · ${start}${endTime ? `–${formatTime(endTime)}` : ''}`;
}

function formatTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
