'use client';

import { submitPlanResponse } from '@/lib/actions/planner';
import { useState, useTransition } from 'react';

type Option = { id: string; label: string };
type Member = { id: string; display_name: string };
type Response = { user_id: string; option_id: string | null; rsvp_status: 'yes' | 'no' | 'maybe' | null; text_response: string | null };

const RSVP_LABEL: Record<'yes' | 'no' | 'maybe', string> = { yes: 'Yes', no: 'No', maybe: 'Maybe' };

export function PlanInstanceCard({
  instance,
  responseType,
  responsePrompt,
  options,
  groupMembers,
  responses,
  currentUserId,
}: {
  instance: { id: string; occurs_on: string };
  responseType: 'rsvp' | 'select_option' | 'custom_text';
  responsePrompt: string | null;
  options: Option[];
  groupMembers: Member[];
  responses: Response[];
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localResponses, setLocalResponses] = useState(responses);
  const [textResponse, setTextResponse] = useState(responses.find((response) => response.user_id === currentUserId)?.text_response ?? '');
  const [responsePulse, setResponsePulse] = useState<string | null>(null);

  const responseByUser = new Map(localResponses.map((r) => [r.user_id, r]));
  const myResponse = responseByUser.get(currentUserId);

  function pulseResponse(key: string) {
    setResponsePulse(key);
    window.setTimeout(() => setResponsePulse((current) => current === key ? null : current), 420);
  }

  function respondWithOption(optionId: string) {
    setError(null);
    startTransition(async () => {
      const result = await submitPlanResponse(instance.id, { optionId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLocalResponses((prev) => [...prev.filter((r) => r.user_id !== currentUserId), { user_id: currentUserId, option_id: optionId, rsvp_status: null, text_response: null }]);
      pulseResponse(`option:${optionId}`);
    });
  }

  function respondWithRsvp(status: 'yes' | 'no' | 'maybe') {
    setError(null);
    startTransition(async () => {
      const result = await submitPlanResponse(instance.id, { rsvpStatus: status });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLocalResponses((prev) => [...prev.filter((r) => r.user_id !== currentUserId), { user_id: currentUserId, option_id: null, rsvp_status: status, text_response: null }]);
      pulseResponse(`rsvp:${status}`);
    });
  }

  function respondWithText() {
    const answer = textResponse.trim();
    if (!answer) {
      setError('Enter an answer first.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitPlanResponse(instance.id, { textResponse: answer });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLocalResponses((prev) => [...prev.filter((r) => r.user_id !== currentUserId), { user_id: currentUserId, option_id: null, rsvp_status: null, text_response: answer }]);
      pulseResponse('text');
    });
  }

  const summary =
    responseType === 'select_option'
      ? buildOptionSummary(options, responseByUser, currentUserId, groupMembers)
      : responseType === 'rsvp'
        ? buildRsvpSummary(responseByUser)
        : buildTextSummary(responseByUser, groupMembers.length);

  return (
    <div className="relay-motion-planner-instance overflow-hidden rounded-md border border-border bg-surface-raised">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-medium text-ink">{formatDate(instance.occurs_on)}</p>
        {summary && <p key={summary} className="relay-motion-crossfade text-xs text-ink-faint">{summary}</p>}
      </div>

      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {groupMembers.map((member) => {
            const response = responseByUser.get(member.id);
            const label =
              responseType === 'select_option'
                ? options.find((o) => o.id === response?.option_id)?.label
                : responseType === 'rsvp' && response?.rsvp_status
                  ? RSVP_LABEL[response.rsvp_status]
                  : response?.text_response ?? undefined;

            return (
              <tr key={member.id} className={member.id === currentUserId && responsePulse ? 'relay-motion-response-row' : ''}>
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
            {options.map((option) => {
              const selected = myResponse?.option_id === option.id;
              const pulsing = responsePulse === `option:${option.id}`;
              return (
                <button
                  key={option.id}
                  disabled={isPending}
                  onClick={() => respondWithOption(option.id)}
                  className={`relay-motion-choice rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-border text-ink-muted hover:bg-surface'
                  } ${pulsing ? 'relay-motion-choice-selected' : ''}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        ) : responseType === 'rsvp' ? (
          <div className="flex gap-2">
            {(['yes', 'maybe', 'no'] as const).map((status) => {
              const selected = myResponse?.rsvp_status === status;
              const pulsing = responsePulse === `rsvp:${status}`;
              return (
                <button
                  key={status}
                  disabled={isPending}
                  onClick={() => respondWithRsvp(status)}
                  className={`relay-motion-choice flex-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selected
                      ? 'border-ink bg-ink text-canvas'
                      : 'border-border text-ink-muted hover:bg-surface'
                  } ${pulsing ? 'relay-motion-choice-selected' : ''}`}
                >
                  {RSVP_LABEL[status]}
                </button>
              );
            })}
          </div>
        ) : (
          <div>
            <label htmlFor={`plan-answer-${instance.id}`} className="mb-1.5 block text-xs font-medium text-ink-muted">{responsePrompt ?? 'Your answer'}</label>
            <div className="flex gap-2">
              <input
                id={`plan-answer-${instance.id}`}
                value={textResponse}
                onChange={(event) => setTextResponse(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter' && !isPending) respondWithText(); }}
                maxLength={240}
                placeholder="Type your answer"
                className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              />
              <button type="button" disabled={isPending || !textResponse.trim()} onClick={respondWithText} className={`rounded-md bg-ink px-4 py-2 text-xs font-medium text-canvas disabled:opacity-40 ${responsePulse === 'text' ? 'relay-motion-choice-selected' : ''}`}>
                {isPending ? 'Saving…' : myResponse?.text_response ? 'Update' : 'Submit'}
              </button>
            </div>
          </div>
        )}
        {error && <p className="relay-motion-row-in mt-2 text-xs text-red-500">{error}</p>}
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

  const myResponse = responseByUser.get(currentUserId);
  if (myResponse?.option_id) {
    const others = groupMembers
      .filter((m) => m.id !== currentUserId && responseByUser.get(m.id)?.option_id === myResponse.option_id)
      .map((m) => m.display_name);

    if (others.length > 0) {
      return `${joinNames(['You', ...others])} are together.`;
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

function buildTextSummary(responseByUser: Map<string, Response>, memberCount: number): string | null {
  const total = [...responseByUser.values()].filter((response) => response.text_response).length;
  return total ? `${total} of ${memberCount} answered.` : null;
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0] ?? '';
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
