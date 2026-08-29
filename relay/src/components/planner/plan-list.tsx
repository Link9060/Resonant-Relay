import Link from 'next/link';

type PlanRow = {
  id: string;
  name: string;
  response_type: 'rsvp' | 'select_option';
  repeat_rule: 'never' | 'daily' | 'weekly' | 'custom';
  group: { id: string; name: string } | null;
  instances: { id: string; occurs_on: string }[];
};

const REPEAT_LABEL: Record<PlanRow['repeat_rule'], string> = {
  never: 'One time',
  daily: 'Daily',
  weekly: 'Weekly',
  custom: 'Custom dates',
};

export function PlanList({
  plans,
  memberCountByGroup,
  responseCountByInstance,
}: {
  plans: PlanRow[];
  memberCountByGroup: Map<string, number>;
  responseCountByInstance: Map<string, number>;
}) {
  if (plans.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-14 text-center">
        <p className="text-sm text-ink-muted">No plans yet.</p>
        <p className="mt-1 text-xs text-ink-faint">
          Create one for something recurring (Seminar) or a one-off (Saturday&apos;s ride).
        </p>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {plans.map((plan) => {
        const sorted = [...plan.instances].sort((a, b) => a.occurs_on.localeCompare(b.occurs_on));
        const nextInstance = sorted.find((i) => i.occurs_on >= today) ?? sorted[sorted.length - 1];
        const memberCount = plan.group ? memberCountByGroup.get(plan.group.id) ?? 0 : 0;
        const responseCount = nextInstance ? responseCountByInstance.get(nextInstance.id) ?? 0 : 0;

        return (
          <li key={plan.id}>
            <Link href={`/planner/${plan.id}`} className="flex items-center justify-between px-3 py-3 hover:bg-surface">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{plan.name}</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {plan.group?.name} · {REPEAT_LABEL[plan.repeat_rule]}
                  {nextInstance && ` · ${formatDate(nextInstance.occurs_on)}`}
                </p>
              </div>
              {nextInstance && (
                <span className="ml-3 shrink-0 text-xs text-ink-faint">
                  {responseCount}/{memberCount} responded
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
