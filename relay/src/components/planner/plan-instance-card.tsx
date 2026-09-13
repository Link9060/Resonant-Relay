'use client';

import { submitPlanResponse } from '@/lib/actions/planner';
import { Clock3 } from 'lucide-react';
import { useState, useTransition } from 'react';

type Option = { id: string; label: string };
type Member = { id: string; display_name: string };
type Response = { user_id: string; option_id: string | null; rsvp_status: 'yes' | 'no' | 'maybe' | null; text_response: string | null };

const RSVP_LABEL: Record<'yes' | 'no' | 'maybe', string> = { yes: 'Yes', no: 'No', maybe: 'Maybe' };

export function PlanInstanceCard({
  instance,
  startTime,
  endTime,
  responseType,
  responsePrompt,
  options,
  groupMembers,
  responses,
  currentUserId,
}: {
  instance: { id: string; occurs_on: string };
  startTime?: string | null;
  endTime?: string | null;
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

  const responseByUser = new Map(localResponses.map((response) => [response.user_id, response]));
  const myResponse = responseByUser.get(currentUserId);

  function pulseResponse(key: string) {
    setResponsePulse(key);
    window.setTimeout(() => setResponsePulse((current) => current === key ? null : current), 420);
  }

  function respondWithOption(optionId: string) {
    setError(null);
    startTransition(async () => {
      const result = await submitPlanResponse(instance.id, { optionId });
      if (!result.ok) return setError(result.error);
      setLocalResponses((current) => [...current.filter((response) => response.user_id !== currentUserId), { user_id: currentUserId, option_id: optionId, rsvp_status: null, text_response: null }]);
      pulseResponse(`option:${optionId}`);
    });
  }

  function respondWithRsvp(status: 'yes' | 'no' | 'maybe') {
    setError(null);
    startTransition(async () => {
      const result = await submitPlanResponse(instance.id, { rsvpStatus: status });
      if (!result.ok) return setError(result.error);
      setLocalResponses((current) => [...current.filter((response) => response.user_id !== currentUserId), { user_id: currentUserId, option_id: null, rsvp_status: status, text_response: null }]);
      pulseResponse(`rsvp:${status}`);
    });
  }

  function respondWithText() {
    const answer = textResponse.trim();
    if (!answer) return setError('Enter an answer first.');
    setError(null);
    startTransition(async () => {
      const result = await submitPlanResponse(instance.id, { textResponse: answer });
      if (!result.ok) return setError(result.error);
      setLocalResponses((current) => [...current.filter((response) => response.user_id !== currentUserId), { user_id: currentUserId, option_id: null, rsvp_status: null, text_response: answer }]);
      pulseResponse('text');
    });
  }

  const summary = responseType === 'select_option'
    ? buildOptionSummary(options, responseByUser, currentUserId, groupMembers)
    : responseType === 'rsvp'
      ? buildRsvpSummary(responseByUser)
      : buildTextSummary(responseByUser, groupMembers.length);

  return (
    <section className="relay-motion-planner-instance overflow-hidden rounded-2xl border border-border bg-canvas shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/45 px-4 py-3.5">
        <div>
          <p className="text-sm font-semibold text-ink">{formatDate(instance.occurs_on)}</p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-ink-faint"><Clock3 size={12} />{formatTimeRange(startTime, endTime)}</p>
        </div>
        {summary && <p key={summary} className="relay-motion-crossfade rounded-full border border-border bg-canvas px-2.5 py-1 text-xs text-ink-muted">{summary}</p>}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[24rem] text-sm">
          <tbody className="divide-y divide-border">
            {groupMembers.map((member) => {
              const response = responseByUser.get(member.id);
              const label = responseType === 'select_option'
                ? options.find((option) => option.id === response?.option_id)?.label
                : responseType === 'rsvp' && response?.rsvp_status
                  ? RSVP_LABEL[response.rsvp_status]
                  : response?.text_response ?? undefined;

              return (
                <tr key={member.id} className={member.id === currentUserId && responsePulse ? 'relay-motion-response-row' : ''}>
                  <td className="px-4 py-3 text-ink">{member.id === currentUserId ? 'You' : member.display_name}</td>
                  <td className="px-4 py-3 text-right">{label ? <span className="font-medium text-ink">{label}</span> : <span className="text-ink-faint">Not decided</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border bg-surface/25 px-4 py-4">
        {responseType === 'select_option' ? (
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const selected = myResponse?.option_id === option.id;
              return <button key={option.id} type="button" disabled={isPending} onClick={() => respondWithOption(option.id)} className={`relay-motion-choice rounded-full border px-3 py-2 text-xs font-semibold transition ${selected ? 'border-ink bg-ink text-canvas' : 'border-border bg-canvas text-ink-muted hover:bg-surface-raised hover:text-ink'} ${responsePulse === `option:${option.id}` ? 'relay-motion-choice-selected' : ''}`}>{option.label}</button>;
            })}
          </div>
        ) : responseType === 'rsvp' ? (
          <div className="grid grid-cols-3 gap-2">
            {(['yes', 'maybe', 'no'] as const).map((status) => {
              const selected = myResponse?.rsvp_status === status;
              return <button key={status} type="button" disabled={isPending} onClick={() => respondWithRsvp(status)} className={`relay-motion-choice rounded-xl border px-3 py-2 text-xs font-semibold transition ${selected ? 'border-ink bg-ink text-canvas' : 'border-border bg-canvas text-ink-muted hover:bg-surface-raised hover:text-ink'} ${responsePulse === `rsvp:${status}` ? 'relay-motion-choice-selected' : ''}`}>{RSVP_LABEL[status]}</button>;
            })}
          </div>
        ) : (
          <div>
            <label htmlFor={`plan-answer-${instance.id}`} className="mb-1.5 block text-xs font-medium text-ink-muted">{responsePrompt ?? 'Your answer'}</label>
            <div className="flex gap-2">
              <input id={`plan-answer-${instance.id}`} value={textResponse} onChange={(event) => setTextResponse(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !isPending) respondWithText(); }} maxLength={240} placeholder="Type your answer" className="min-w-0 flex-1 rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus-visible:border-ink-muted" />
              <button type="button" disabled={isPending || !textResponse.trim()} onClick={respondWithText} className={`rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-canvas disabled:opacity-40 ${responsePulse === 'text' ? 'relay-motion-choice-selected' : ''}`}>{isPending ? 'Saving…' : myResponse?.text_response ? 'Update' : 'Submit'}</button>
            </div>
          </div>
        )}
        {error && <p className="relay-motion-row-in mt-2 text-xs text-red-500">{error}</p>}
      </div>
    </section>
  );
}

function buildOptionSummary(options: Option[], responseByUser: Map<string, Response>, currentUserId: string, groupMembers: Member[]) {
  const counts = new Map<string, number>();
  for (const response of responseByUser.values()) if (response.option_id) counts.set(response.option_id, (counts.get(response.option_id) ?? 0) + 1);
  if (counts.size === 0) return null;

  const myResponse = responseByUser.get(currentUserId);
  if (myResponse?.option_id) {
    const others = groupMembers.filter((member) => member.id !== currentUserId && responseByUser.get(member.id)?.option_id === myResponse.option_id).map((member) => member.display_name);
    if (others.length) return `${joinNames(['You', ...others])} are together.`;
  }

  const topEntry = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!topEntry) return null;
  const [topOptionId, topCount] = topEntry;
  const topLabel = options.find((option) => option.id === topOptionId)?.label ?? 'one option';
  return `${topCount} ${topCount === 1 ? 'person is' : 'people are'} going to ${topLabel}.`;
}

function buildRsvpSummary(responseByUser: Map<string, Response>) {
  if (!responseByUser.size) return null;
  const yesCount = [...responseByUser.values()].filter((response) => response.rsvp_status === 'yes').length;
  return `${yesCount} of ${responseByUser.size} said yes.`;
}

function buildTextSummary(responseByUser: Map<string, Response>, memberCount: number) {
  const total = [...responseByUser.values()].filter((response) => response.text_response).length;
  return total ? `${total} of ${memberCount} answered.` : null;
}

function joinNames(names: string[]) {
  if (names.length === 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function formatDate(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
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
