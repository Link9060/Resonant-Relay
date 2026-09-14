'use client';

import { CustomDateCalendar } from '@/components/planner/custom-date-calendar';
import { updatePlan } from '@/lib/actions/planner';
import * as Dialog from '@radix-ui/react-dialog';
import { CalendarDays, Clock3, Loader2, PencilLine, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type RepeatRule = 'never' | 'daily' | 'weekly' | 'custom';

type EditablePlan = {
  id: string;
  name: string;
  notes: string | null;
  repeat_rule: RepeatRule;
  starts_on: string;
  repeat_until: string | null;
  start_time?: string | null;
  end_time?: string | null;
  instances?: Array<{ id?: string; occurs_on: string }>;
};

export function EditPlanDialog({ plan }: { plan: EditablePlan }) {
  const futureCustomDates = useMemo(() => {
    const cutoff = today();
    const dates = (plan.instances ?? []).map((instance) => instance.occurs_on).filter((date) => date >= cutoff).sort();
    return dates.length ? dates : [plan.starts_on >= cutoff ? plan.starts_on : cutoff];
  }, [plan.instances, plan.starts_on]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(plan.name);
  const [notes, setNotes] = useState(plan.notes ?? '');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>(plan.repeat_rule);
  const [startsOn, setStartsOn] = useState(plan.starts_on);
  const [repeatUntil, setRepeatUntil] = useState(plan.repeat_until ?? '');
  const [customDates, setCustomDates] = useState<string[]>(futureCustomDates);
  const [startTime, setStartTime] = useState(plan.start_time?.slice(0, 5) ?? '');
  const [endTime, setEndTime] = useState(plan.end_time?.slice(0, 5) ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scheduleSummary = useMemo(() => {
    const repeatLabel = { never: 'One time', daily: 'Every day', weekly: 'Every week', custom: 'Custom dates' }[repeatRule];
    const dateLabel = repeatRule === 'custom' ? `${customDates.length} selected ${customDates.length === 1 ? 'day' : 'days'}` : formatDate(startsOn);
    const timeLabel = startTime ? `${formatTime(startTime)}${endTime ? `–${formatTime(endTime)}` : ''}` : 'All day';
    return `${repeatLabel} · ${dateLabel} · ${timeLabel}`;
  }, [customDates.length, endTime, repeatRule, startTime, startsOn]);

  function reset() {
    setName(plan.name);
    setNotes(plan.notes ?? '');
    setRepeatRule(plan.repeat_rule);
    setStartsOn(plan.starts_on);
    setRepeatUntil(plan.repeat_until ?? '');
    setCustomDates(futureCustomDates);
    setStartTime(plan.start_time?.slice(0, 5) ?? '');
    setEndTime(plan.end_time?.slice(0, 5) ?? '');
    setError(null);
    setLoading(false);
  }

  async function save() {
    setError(null);
    if (!name.trim()) return setError('Give the plan a name.');
    if (repeatRule === 'custom' && customDates.length === 0) return setError('Pick at least one future date.');
    if ((repeatRule === 'daily' || repeatRule === 'weekly') && repeatUntil && repeatUntil < startsOn) return setError('End date needs to be on or after the start date.');
    if (startTime && endTime && endTime <= startTime) return setError('End time needs to be after the start time.');

    setLoading(true);
    const result = await updatePlan({
      planId: plan.id,
      name,
      notes,
      repeatRule,
      startsOn: repeatRule === 'custom' ? customDates[0] ?? startsOn : startsOn,
      repeatUntil: repeatRule === 'daily' || repeatRule === 'weekly' ? repeatUntil || null : null,
      customDates,
      startTime: startTime || null,
      endTime: startTime && endTime ? endTime : null,
    });
    setLoading(false);

    if (!result.ok) return setError(result.error);
    setOpen(false);
    window.location.reload();
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <Dialog.Trigger asChild>
        <button type="button" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-ink-muted transition hover:bg-surface hover:text-ink">
          <PencilLine size={14} /> Edit
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-canvas shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-canvas/95 px-5 py-4 backdrop-blur-xl">
            <div>
              <Dialog.Title className="font-display text-xl font-medium text-ink">Edit plan</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-faint">Update future dates and timing without rebuilding the plan.</Dialog.Description>
            </div>
            <Dialog.Close className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-surface hover:text-ink"><X size={18} /></Dialog.Close>
          </div>

          <div className="space-y-5 p-5">
            <section className="rounded-2xl border border-border bg-surface/45 p-4">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-border bg-canvas text-ink-muted"><PencilLine size={14} /></span>
                <div><h3 className="text-sm font-semibold text-ink">Basics</h3><p className="text-xs text-ink-faint">Name and details everyone sees.</p></div>
              </div>
              <div className="space-y-3">
                <Field label="Plan name"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} className={inputClass} /></Field>
                <Field label="Notes (optional)"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className={`${inputClass} resize-none`} /></Field>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-surface/45 p-4">
              <div className="mb-4 flex items-start gap-2.5">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-canvas text-ink-muted"><CalendarDays size={14} /></span>
                <div><h3 className="text-sm font-semibold text-ink">Schedule</h3><p className="mt-0.5 text-xs text-ink-faint">{scheduleSummary}</p></div>
              </div>

              <div className="space-y-4">
                <Field label="Repeats">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(['never', 'weekly', 'daily', 'custom'] as const).map((rule) => (
                      <ChoiceCard key={rule} active={repeatRule === rule} onClick={() => setRepeatRule(rule)}>
                        {{ never: 'One time', weekly: 'Weekly', daily: 'Daily', custom: 'Custom' }[rule]}
                      </ChoiceCard>
                    ))}
                  </div>
                </Field>

                {repeatRule === 'custom' ? (
                  <Field label="Pick future days">
                    <CustomDateCalendar value={customDates} onChange={setCustomDates} minDate={today()} />
                    <p className="mt-2 text-[11px] leading-4 text-ink-faint">Unchanged dates keep their existing responses. Removing a future date removes that occurrence and its responses.</p>
                  </Field>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={repeatRule === 'never' ? 'Date' : 'Starts on'}>
                      <input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} className={inputClass} />
                    </Field>
                    {(repeatRule === 'daily' || repeatRule === 'weekly') && (
                      <Field label="Ends on (optional)">
                        <input type="date" min={startsOn} value={repeatUntil} onChange={(event) => setRepeatUntil(event.target.value)} className={inputClass} />
                      </Field>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-border bg-canvas p-3">
                  <div className="mb-3 flex items-center gap-2"><Clock3 size={14} className="text-ink-faint" /><p className="text-xs font-semibold text-ink">Time</p><span className="ml-auto text-[11px] text-ink-faint">Blank = all day</span></div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Starts"><input type="time" value={startTime} onChange={(event) => { setStartTime(event.target.value); if (!event.target.value) setEndTime(''); }} className={inputClass} /></Field>
                    <Field label="Ends (optional)"><input type="time" value={endTime} min={startTime || undefined} disabled={!startTime} onChange={(event) => setEndTime(event.target.value)} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-40`} /></Field>
                  </div>
                </div>
              </div>
            </section>

            <div className="rounded-xl border border-border bg-surface/40 px-3 py-2.5 text-xs leading-5 text-ink-faint">
              Response style and choices stay locked so existing group answers remain valid. Schedule edits apply to today and future occurrences; past plan history is left alone.
            </div>

            {error && <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-500">{error}</p>}

            <button type="button" onClick={save} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-semibold text-canvas transition hover:opacity-90 disabled:opacity-40">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputClass = 'min-h-10 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus-visible:border-ink-muted focus-visible:ring-2 focus-visible:ring-ink/5';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</label>{children}</div>;
}

function ChoiceCard({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold transition ${active ? 'border-ink bg-ink text-canvas shadow-sm' : 'border-border bg-canvas text-ink-muted hover:bg-surface-raised hover:text-ink'}`}>{children}</button>;
}

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  if (!value) return 'Choose a date';
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
