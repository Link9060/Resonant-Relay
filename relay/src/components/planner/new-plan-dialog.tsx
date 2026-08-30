'use client';

import { createPlan } from '@/lib/actions/planner';
import * as Dialog from '@radix-ui/react-dialog';
import { CalendarPlus, Loader2, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { staticDetailPath } from '@/lib/config';

type Group = { id: string; name: string };
type ResponseType = 'rsvp' | 'select_option';
type RepeatRule = 'never' | 'daily' | 'weekly' | 'custom';

const today = () => new Date().toISOString().slice(0, 10);

export function NewPlanDialog({ groups }: { groups: Group[] }) {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [responseType, setResponseType] = useState<ResponseType>('select_option');
  const [options, setOptions] = useState(['', '']);
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('weekly');
  const [startsOn, setStartsOn] = useState(today());
  const [repeatUntil, setRepeatUntil] = useState('');
  const [customDates, setCustomDates] = useState<string[]>([today()]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function reset() {
    setGroupId(groups[0]?.id ?? '');
    setName('');
    setNotes('');
    setResponseType('select_option');
    setOptions(['', '']);
    setRepeatRule('weekly');
    setStartsOn(today());
    setRepeatUntil('');
    setCustomDates([today()]);
    setError(null);
    setLoading(false);
  }

  async function handleSubmit() {
    setError(null);
    if (!groupId) return setError('Choose a group.');
    if (!name.trim()) return setError('Give the plan a name.');
    if (responseType === 'select_option' && options.filter((o) => o.trim()).length < 2) {
      return setError('Add at least two options.');
    }
    if (repeatRule === 'custom' && customDates.filter(Boolean).length === 0) {
      return setError('Pick at least one date.');
    }

    setLoading(true);
    const result = await createPlan({
      groupId,
      name,
      notes,
      responseType,
      options,
      repeatRule,
      startsOn,
      repeatUntil: repeatRule === 'daily' || repeatRule === 'weekly' ? repeatUntil || null : null,
      customDates,
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.push(staticDetailPath('planner', result.data.planId));
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-canvas transition-all hover:opacity-90 active:scale-[0.97]">
          <CalendarPlus size={16} />
          New plan
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-40 max-h-[85vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-border bg-surface-raised p-5 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-medium text-ink">New plan</Dialog.Title>
            <Dialog.Close className="text-ink-faint hover:text-ink">
              <X size={18} />
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-4">
            <Field label="Group">
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seminar"
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              />
            </Field>

            <Field label="What are people responding to?">
              <div className="flex gap-2">
                <RadioPill active={responseType === 'select_option'} onClick={() => setResponseType('select_option')}>
                  Choose an option
                </RadioPill>
                <RadioPill active={responseType === 'rsvp'} onClick={() => setResponseType('rsvp')}>
                  Yes / No / Maybe
                </RadioPill>
              </div>
            </Field>

            {responseType === 'select_option' && (
              <Field label="Options">
                <div className="space-y-2">
                  {options.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        value={opt}
                        onChange={(e) => setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))}
                        placeholder={i === 0 ? 'Mr. Smith — Math' : 'Library'}
                        className="flex-1 rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-ink-faint hover:text-ink"
                          aria-label="Remove option"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setOptions((prev) => [...prev, ''])}
                    className="flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
                  >
                    <Plus size={14} /> Add option
                  </button>
                </div>
              </Field>
            )}

            <Field label="Repeats">
              <div className="flex flex-wrap gap-2">
                {(['never', 'weekly', 'daily', 'custom'] as const).map((rule) => (
                  <RadioPill key={rule} active={repeatRule === rule} onClick={() => setRepeatRule(rule)}>
                    {{ never: 'Never', weekly: 'Weekly', daily: 'Daily', custom: 'Custom dates' }[rule]}
                  </RadioPill>
                ))}
              </div>
            </Field>

            {repeatRule !== 'custom' ? (
              <Field label={repeatRule === 'never' ? 'Date' : 'Starts on'}>
                <input
                  type="date"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                  className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
                />
              </Field>
            ) : (
              <Field label="Dates">
                <div className="space-y-2">
                  {customDates.map((d, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="date"
                        value={d}
                        onChange={(e) => setCustomDates((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                        className="flex-1 rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
                      />
                      {customDates.length > 1 && (
                        <button
                          onClick={() => setCustomDates((prev) => prev.filter((_, idx) => idx !== i))}
                          className="text-ink-faint hover:text-ink"
                          aria-label="Remove date"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setCustomDates((prev) => [...prev, today()])}
                    className="flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink"
                  >
                    <Plus size={14} /> Add date
                  </button>
                </div>
              </Field>
            )}

            {(repeatRule === 'daily' || repeatRule === 'weekly') && (
              <Field label="Ends on (optional)">
                <input
                  type="date"
                  value={repeatUntil}
                  onChange={(e) => setRepeatUntil(e.target.value)}
                  className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
                />
                <p className="mt-1 text-xs text-ink-faint">Leave blank to start with the next 8 occurrences.</p>
              </Field>
            )}

            <Field label="Notes (optional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
              />
            </Field>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-ink py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Create plan
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</label>
      {children}
    </div>
  );
}

function RadioPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'border-ink bg-ink text-canvas' : 'border-border text-ink-muted hover:bg-surface'
      }`}
    >
      {children}
    </button>
  );
}
