'use client';

import { deletePlan } from '@/lib/actions/planner';
import { appPageUrl } from '@/lib/config';
import { Clock3, Trash2 } from 'lucide-react';

const REPEAT_LABEL: Record<string, string> = {
  never: 'One time',
  daily: 'Repeats daily',
  weekly: 'Repeats weekly',
  custom: 'Custom schedule',
};

export function PlanHeader({
  plan,
  groupName,
  canDelete,
}: {
  plan: { id: string; name: string; notes: string | null; repeat_rule: string; start_time?: string | null; end_time?: string | null };
  groupName: string;
  canDelete: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="truncate font-display text-2xl font-medium tracking-tight text-ink">{plan.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-faint">
          <span>{groupName}</span>
          <span aria-hidden="true">·</span>
          <span>{REPEAT_LABEL[plan.repeat_rule] ?? 'Plan'}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 size={13} />{formatTimeRange(plan.start_time, plan.end_time)}</span>
        </div>
        {plan.notes && <p className="mt-3 max-w-xl text-sm leading-6 text-ink-muted">{plan.notes}</p>}
      </div>
      {canDelete && (
        <button
          type="button"
          onClick={async () => {
            if (!window.confirm('Delete this plan?')) return;
            const result = await deletePlan(plan.id);
            if (result.ok) window.location.assign(appPageUrl('/planner'));
          }}
          aria-label="Delete plan"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-transparent text-ink-faint transition hover:border-border hover:bg-surface hover:text-red-500"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
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
