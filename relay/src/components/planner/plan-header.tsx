'use client';

import { deletePlan } from '@/lib/actions/planner';
import { Trash2 } from 'lucide-react';

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
  plan: { id: string; name: string; notes: string | null; repeat_rule: string };
  groupName: string;
  canDelete: boolean;
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">{plan.name}</h1>
        <p className="mt-1 text-sm text-ink-faint">
          {groupName} · {REPEAT_LABEL[plan.repeat_rule]}
        </p>
        {plan.notes && <p className="mt-3 text-sm text-ink-muted">{plan.notes}</p>}
      </div>
      {canDelete && (
        <form
          action={async () => {
            await deletePlan(plan.id);
          }}
        >
          <button
            type="submit"
            aria-label="Delete plan"
            className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-surface hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
