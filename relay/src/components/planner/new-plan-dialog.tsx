'use client';

import { CustomDateCalendar } from '@/components/planner/custom-date-calendar';
import { createPlan } from '@/lib/actions/planner';
import { appPageUrl, staticDetailPath } from '@/lib/config';
import * as Dialog from '@radix-ui/react-dialog';
import { CalendarDays, CalendarPlus, Clock3, Loader2, MessageSquareText, Plus, Repeat2, Users, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Group = { id: string; name: string };
type ResponseType = 'rsvp' | 'select_option' | 'custom_text';
type RepeatRule = 'never' | 'daily' | 'weekly' | 'custom';

const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function NewPlanDialog({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [responseType, setResponseType] = useState<ResponseType>('select_option');
  const [options, setOptions] = useState(['', '']);
  const [responsePrompt, setResponsePrompt] = useState('');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('weekly');
  const [startsOn, setStartsOn] = useState(today());
  const [repeatUntil, setRepeatUntil] = useState('');
  const [customDates, setCustomDates] = useState<string[]>([today()]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const scheduleSummary = useMemo(() => {
    const dateLabel = repeatRule === 'custom'
      ? `${customDates.filter(Boolean).length} selected ${customDates.filter(Boolean).length === 1 ? 'day' : 'days'}`
      : formatDate(startsOn);
    const repeatLabel = { never: 'One time', daily: 'Every day', weekly: 'Every week', custom: 'Custom dates' }[repeatRule];
    const timeLabel = startTime ? `${formatTime(startTime)}${endTime ? `–${formatTime(endTime)}` : ''}` : 'All day';
    return `${repeatLabel} · ${dateLabel} · ${timeLabel}`;
  }, [customDates, endTime, repeatRule, startTime, startsOn]);

  function reset() {
    setGroupId(groups[0]?.id ?? '');
    setName('');
    setNotes('');
    setResponseType('select_option');
    setOptions(['', '']);
    setResponsePrompt('');
    setRepeatRule('weekly');
    setStartsOn(today());
    setRepeatUntil('');
    setCustomDates([today()]);
    setStartTime('');
    setEndTime('');
    setError(null);
    setLoading(false);
  }

  async function handleSubmit() {
    setError(null);
    if (!groupId) return setError('Choose a group.');
    if (!name.trim()) return setError('Give the plan a name.');
    if (responseType === 'select_option' && options.filter((option) => option.trim()).length < 2) return setError('Add at least two options.');
    if (responseType === 'custom_text' && !responsePrompt.trim()) return setError('Add a question for the written answer.');
    if (repeatRule === 'custom' && customDates.filter(Boolean).length === 0) return setError('Pick at least one date.');
    if (startTime && endTime && endTime <= startTime) return setError('End time needs to be after the start time.');

    setLoading(true);
    const result = await createPlan({
      groupId,
      name,
      notes,
      responseType,
      options,
      responsePrompt,
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
    window.location.assign(appPageUrl(staticDetailPath('planner', result.data.planId)));
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { setOpen(next); if (!next) reset(); }}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-canvas transition hover:opacity-90 active:scale-[0.98]">
          <CalendarPlus size={16} /> New plan
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-black/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-40 max-h-[90vh] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-canvas shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-canvas/95 px-5 py-4 backdrop-blur-xl">
            <div>
              <Dialog.Title className="font-display text-xl font-medium text-ink">Build a plan</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-ink-faint">Set the schedule once. Relay keeps the active occurrence moving forward automatically.</Dialog.Description>
            </div>
            <Dialog.Close className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-faint hover:bg-surface hover:text-ink"><X size={18} /></Dialog.Close>
          </div>

          <div className="space-y-5 p-5">
            <Section icon={<Users size={15} />} title="Basics" description="What is this plan and who is it for?">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Group">
                  <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className={inputClass}>
                    {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                  </select>
                </Field>
                <Field label="Plan name">
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Seminar" className={inputClass} />
                </Field>
              </div>
            </Section>

            <Section icon={<CalendarDays size={15} />} title="Schedule" description={scheduleSummary}>
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
                <Field label="Pick the days">
                  <CustomDateCalendar value={customDates} onChange={setCustomDates} minDate={today()} />
                  <p className="mt-2 text-[11px] leading-4 text-ink-faint">Click any day box to add or remove it. Use the arrows to move between months.</p>
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

              <div className="rounded-xl border border-border bg-surface/60 p-3">
                <div className="mb-3 flex items-center gap-2"><Clock3 size={14} className="text-ink-faint" /><p className="text-xs font-semibold text-ink">Time</p><span className="ml-auto text-[11px] text-ink-faint">Leave blank for all day</span></div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Starts">
                    <input type="time" value={startTime} onChange={(event) => { setStartTime(event.target.value); if (!event.target.value) setEndTime(''); }} className={inputClass} />
                  </Field>
                  <Field label="Ends (optional)">
                    <input type="time" value={endTime} min={startTime || undefined} disabled={!startTime} onChange={(event) => setEndTime(event.target.value)} className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-40`} />
                  </Field>
                </div>
              </div>
            </Section>

            <Section icon={<MessageSquareText size={15} />} title="Responses" description="What should people tell the group?">
              <div className="grid gap-2 sm:grid-cols-3">
                <ChoiceCard active={responseType === 'select_option'} onClick={() => setResponseType('select_option')}>Choose option</ChoiceCard>
                <ChoiceCard active={responseType === 'rsvp'} onClick={() => setResponseType('rsvp')}>Yes / No / Maybe</ChoiceCard>
                <ChoiceCard active={responseType === 'custom_text'} onClick={() => setResponseType('custom_text')}>Written answer</ChoiceCard>
              </div>

              {responseType === 'select_option' && (
                <Field label="Choices">
                  <div className="space-y-2">
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input value={option} onChange={(event) => setOptions((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} placeholder={index === 0 ? 'Mr. Smith — Math' : 'Library'} className={inputClass} />
                        {options.length > 2 && <button type="button" onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove option" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border text-ink-faint hover:bg-surface hover:text-ink"><X size={15} /></button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setOptions((current) => [...current, ''])} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink"><Plus size={13} />Add choice</button>
                  </div>
                </Field>
              )}

              {responseType === 'custom_text' && (
                <Field label="Question">
                  <input value={responsePrompt} onChange={(event) => setResponsePrompt(event.target.value)} maxLength={120} placeholder="Which teacher are you going to?" className={inputClass} />
                  <p className="mt-1.5 text-[11px] leading-4 text-ink-faint">Each person gets their own short answer box.</p>
                </Field>
              )}
            </Section>

            <Section icon={<Repeat2 size={15} />} title="Details" description="Optional context for everyone in the plan.">
              <Field label="Notes (optional)">
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Room, instructions, what to bring…" className={`${inputClass} resize-none`} />
              </Field>
            </Section>

            {error && <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5 text-sm text-red-500">{error}</p>}

            <button type="button" onClick={handleSubmit} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 text-sm font-semibold text-canvas transition hover:opacity-90 disabled:opacity-40">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Creating…' : 'Create plan'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const inputClass = 'min-h-10 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus-visible:border-ink-muted focus-visible:ring-2 focus-visible:ring-ink/5';

function Section({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface/45 p-4">
      <div className="mb-4 flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-border bg-canvas text-ink-muted">{icon}</span>
        <div><h3 className="text-sm font-semibold text-ink">{title}</h3><p className="mt-0.5 text-xs text-ink-faint">{description}</p></div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</label>{children}</div>;
}

function ChoiceCard({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold transition ${active ? 'border-ink bg-ink text-canvas shadow-sm' : 'border-border bg-canvas text-ink-muted hover:bg-surface-raised hover:text-ink'}`}>
      {children}
    </button>
  );
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
