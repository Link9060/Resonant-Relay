'use client';

import { submitPlanResponse } from '@/lib/actions/planner';
import { useState, useTransition } from 'react';

type Option = { id: string; label: string };
type Member = { id: string; display_name: string };
type Response = { user_id: string; option_id: string | null; rsvp_status: 'yes' | 'no' | 'maybe' | null };

const RSVP_LABEL: Record<'yes' | 'no' | 'maybe', string> = { yes: 'Yes', no: 'No', maybe: 'Maybe' };

export function PlanInstanceCard({
  instance,
  responseType,
  options,
  groupMembers,
  responses,
  currentUserId,
}: {
  instance: { id: string; occurs_on: string };
  responseType: 'rsvp' | 'select_option';
  options: Option[];
  groupMembers: Member[];
  responses: Response[];
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const responseByUser = new Map(responses.map((r) => [r.user_id, r]));
  const myResponse = responseByUser.get(currentUserId);

  function respondWithOption(optionId: string) {
    setError(null);
    startTransition(async () => {
      const result = await submitPlanResponse(instance.id, { optionId });
      if (!result.ok) setError(result.error);
    });
  }

  function respondWithRsvp(status: 'yes' | 'no' | 'maybe') {
    setError(null);
    startTransition(async () => {
      const result = await submitPlanResponse(instance.id, { rsvpStatus: status });
      if (!result.ok) setError(result.error);
    });
  }

  const summary =
    responseType === 'select_option'
      ? buildOptionSummary(options, responseByUser, currentUserId, groupMembers)
      : buildRsvpSummary(responseByUser);

  return (
    <div className="rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-ink">{formatDate(instance.occurs_on)}</p>
        {summary && <p className="text-xs text-ink-faint">{summary}</p>}
      </div>

      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {groupMembers.map((member) => {
            const response = responseByUser.get(member.id);
            const label =
              responseType === 'select_option'
                ? options.find((o) => o.id === response?.option_id)?.label
                : response?.rsvp_status
                  ? RSVP_LABEL[response.rsvp_status]
                  : undefined;

            return (
              <tr key={member.id}>
                <td className="px-4 py-2 text-ink">
                  {member.id === currentUserId ? 'You' : member.display_name}
                </td>
                <td className="px-4 py-2 text-right">
                  {label ? <span className="text-ink">{label}</span> : <span className="text-ink-faint">Not decided</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="border-t border-border px-4 py-3">
        {responseType === 'select_option' ? (
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.id}
                disabled={isPending}
                onClick={() => respondWithOption(option.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  myResponse?.option_id === option.id
                    ? 'border-ink bg-ink text-canvas'
                    : 'border-border text-ink-muted hover:bg-surface'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-2">
            {(['yes', 'maybe', 'no'] as const).map((status) => (
              <button
                key={status}
                disabled={isPending}
                onClick={() => respondWithRsvp(status)}
                className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  myResponse?.rsvp_status === status
                    ? 'border-ink bg-ink text-canvas'
                    : 'border-border text-ink-muted hover:bg-surface'
                }`}
              >
                {RSVP_LABEL[status]}
              </button>
            ))}
          </div>
        )}
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}

function buildOptionSummary(
  options: Option[],
  responseByUser: Map<string, Response>,
  currentUserId: string,
  groupMembers: Member[]
): string | null {
  const counts = new Map<string, number>();
  for (const r of responseByUser.values()) {
    if (r.option_id) counts.set(r.option_id, (counts.get(r.option_id) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  // "You, Jack, and Owen are together this Seminar" — if the current user has
  // responded, lead with who they're grouped with.
  const myResponse = responseByUser.get(currentUserId);
  if (myResponse?.option_id) {
    const namesById = new Map(groupMembers.map((m) => [m.id, m.display_name]));
    const others = groupMembers
      .filter((m) => m.id !== currentUserId && responseByUser.get(m.id)?.option_id === myResponse.option_id)
      .map((m) => namesById.get(m.id)!);

    if (others.length > 0) {
      return `You, ${joinNames(others)} are together.`;
    }
  }

  const topEntry = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!topEntry) return null;
  const [topOptionId, topCount] = topEntry;
  const topLabel = options.find((o) => o.id === topOptionId)?.label ?? 'one option';
  return `${topCount} ${topCount === 1 ? 'person is' : 'people are'} going to ${topLabel}.`;
}

function buildRsvpSummary(responseByUser: Map<string, Response>): string | null {
  const total = responseByUser.size;
  if (total === 0) return null;
  const yesCount = [...responseByUser.values()].filter((r) => r.rsvp_status === 'yes').length;
  return `${yesCount} of ${total} said yes.`;
}

function joinNames(names: string[]): string {
  if (names.length === 1) return `${names[0]}`;
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function formatDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
