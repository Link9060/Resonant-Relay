'use client';

import { createClient } from '@/lib/supabase/client';
import { CalendarDays, Loader2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

export type RelayCalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  event_date: string;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  details: string | null;
  created_at: string;
  updated_at: string;
};

export function RelayEventDialog({
  date,
  event,
  onClose,
  onSaved,
}: {
  date: string;
  event?: RelayCalendarEvent | null;
  onClose: () => void;
  onSaved: (event: RelayCalendarEvent) => void;
}) {
  const [title, setTitle] = useState(event?.title ?? '');
  const [eventDate, setEventDate] = useState(event?.event_date ?? date);
  const [allDay, setAllDay] = useState(event?.is_all_day ?? true);
  const [startTime, setStartTime] = useState(normalizeTime(event?.start_time) ?? '09:00');
  const [endTime, setEndTime] = useState(normalizeTime(event?.end_time) ?? '10:00');
  const [details, setDetails] = useState(event?.details ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formEvent: FormEvent) {
    formEvent.preventDefault();
    const cleanTitle = title.trim();
    if (!cleanTitle) { setError('Give the event a name.'); return; }
    if (!allDay && !startTime) { setError('Choose a start time.'); return; }
    if (!allDay && endTime && endTime <= startTime) { setError('End time needs to be after the start time.'); return; }

    setBusy(true);
    setError(null);
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError('Your Relay session is not available.');
      return;
    }

    const payload = {
      user_id: user.id,
      title: cleanTitle,
      event_date: eventDate,
      is_all_day: allDay,
      start_time: allDay ? null : startTime,
      end_time: allDay || !endTime ? null : endTime,
      details: details.trim() || null,
    };

    const query = event
      ? supabase.from('relay_calendar_events').update(payload).eq('id', event.id).eq('user_id', user.id)
      : supabase.from('relay_calendar_events').insert(payload);
    const { data, error: saveError } = await query.select('*').single();
    setBusy(false);

    if (saveError || !data) {
      setError('Relay could not save this event. Make sure the 1.0.7 database migration has been applied.');
      return;
    }

    onSaved(data as RelayCalendarEvent);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <button type="button" aria-label="Close event editor" className="absolute inset-0 cursor-default" onClick={onClose} />
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label={event ? 'Edit Relay event' : 'New Relay event'} className="relay-motion-pop relative z-10 w-full max-w-lg rounded-2xl border border-border bg-surface-raised p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-canvas text-ink-muted"><CalendarDays size={18} /></span>
            <div>
              <h2 className="font-display text-xl font-medium tracking-tight text-ink">{event ? 'Edit event' : 'New Relay event'}</h2>
              <p className="mt-1 text-xs text-ink-faint">Saved only in Relay. Google and Microsoft calendars are not changed.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-faint hover:bg-surface"><X size={17} /></button>
        </div>

        <label className="mt-5 block text-xs font-medium text-ink-muted">Event name
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="What’s happening?" className="profile-input mt-1.5" />
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium text-ink-muted">Date
            <input type="date" value={eventDate} onChange={(event) => setEventDate(event.target.value)} required className="profile-input mt-1.5" />
          </label>
          <label className="flex items-end">
            <span className="flex min-h-11 w-full items-center gap-2 rounded-md border border-border bg-canvas px-3 text-sm text-ink">
              <input type="checkbox" checked={allDay} onChange={(event) => setAllDay(event.target.checked)} className="h-4 w-4" />All day
            </span>
          </label>
        </div>

        {!allDay && (
          <div className="relay-motion-expand mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-ink-muted">Start
              <input type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required className="profile-input mt-1.5" />
            </label>
            <label className="block text-xs font-medium text-ink-muted">End
              <input type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} className="profile-input mt-1.5" />
            </label>
          </div>
        )}

        <label className="mt-4 block text-xs font-medium text-ink-muted">Details <span className="font-normal text-ink-faint">(optional)</span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={4} placeholder="Notes, location, reminders to yourself…" className="profile-input mt-1.5 resize-none" />
        </label>

        {error && <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="min-h-11 rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-surface">Cancel</button>
          <button type="submit" disabled={busy} className="inline-flex min-h-11 min-w-28 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-canvas disabled:opacity-50">
            {busy && <Loader2 size={15} className="animate-spin" />}{busy ? 'Saving…' : event ? 'Save changes' : 'Add event'}
          </button>
        </div>
      </form>
    </div>
  );
}

function normalizeTime(value?: string | null) {
  if (!value) return null;
  return value.slice(0, 5);
}
