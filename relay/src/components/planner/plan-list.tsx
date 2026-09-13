import { appPageUrl, staticDetailPath } from '@/lib/config';
import { localDateKey } from '@/lib/date';

type PlanRow = {
  id: string;
  name: string;
  response_type: 'rsvp' | 'select_option' | 'custom_text';
  repeat_rule: 'never' | 'daily' | 'weekly' | 'custom';
  start_time?: string | null;
  end_time?: string | null;
  group: { id: string; name: string } | null;
  instances: { id: string; occurs_on: string }[];
};

const REPEAT_LABEL: Record<PlanRow['repeat_rule'], string> = {
  never: 'One time',
  daily: 'Daily',
  weekly: 'Weekly',
  custom: 'Custom dates',
};

export function PlanList({ plans, memberCountByGroup, responseCountByInstance }: {
  plans: PlanRow[];
  memberCountByGroup: Map<string, number>;
  responseCountByInstance: Map<string, number>;
}) {
  const today = localDateKey();
  const activePlans = plans
    .map((plan) => ({
      plan,
      upcoming: [...(plan.instances ?? [])].filter((instance) => instance.occurs_on >= today).sort((a, b) => a.occurs_on.localeCompare(b.occurs_on)),
    }))
    .filter(({ upcoming }) => upcoming.length > 0)
    .sort((a, b) => (a.upcoming[0]?.occurs_on ?? '').localeCompare(b.upcoming[0]?.occurs_on ?? ''));

  if (activePlans.length === 0) {
    return (
      <div className="relay-motion-planner-empty rounded-2xl border border-dashed border-border bg-surface/30 py-14 text-center">
        <p className="text-sm font-medium text-ink-muted">No upcoming plans.</p>
        <p className="mt-1 text-xs text-ink-faint">Create a plan and Relay will keep only the current and future days in this view.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {activePlans.map(({ plan, upcoming }, index) => {
        const nextInstance = upcoming[0];
        const memberCount = plan.group ? memberCountByGroup.get(plan.group.id) ?? 0 : 0;
        const responseCount = nextInstance ? responseCountByInstance.get(nextInstance.id) ?? 0 : 0;
        const nextLabel = nextInstance ? `${formatDate(nextInstance.occurs_on)} · ${formatTimeRange(plan.start_time, plan.end_time)}` : '';

        return (
          <li key={plan.id} className="relay-motion-plan-card" style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}>
            <a href={appPageUrl(staticDetailPath('planner', plan.id))} className="group block rounded-2xl border border-border bg-canvas p-4 transition hover:-translate-y-0.5 hover:bg-surface/45 hover:shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{plan.name}</p>
                    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-medium text-ink-faint">{REPEAT_LABEL[plan.repeat_rule]}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-muted">{nextLabel}</p>
                  <p className="mt-1 text-[11px] text-ink-faint">{plan.group?.name ?? 'Relay group'} · {upcoming.length} upcoming {upcoming.length === 1 ? 'day' : 'days'}</p>
                </div>
                {nextInstance && <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted">{responseCount}/{memberCount} responded</span>}
              </div>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTimeRange(startTime?: string | null, endTime?: string | null) {
  if (!startTime) return 'All day';
  const start = formatTime(startTime);
  return endTime ? `${start}–${formatTime(endTime)}` : start;
}

function formatTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
