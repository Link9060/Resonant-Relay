'use client';

import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type Provider = 'google' | 'microsoft';
type Account = { id: string; provider: Provider; email_address: string; display_name: string | null; granted_scope: string };
type CalendarEvent = { id: string; summary: string; start: string; end?: string | null; isAllDay: boolean; htmlLink?: string | null; accountEmail: string; provider: Provider };
type RelayPlan = { instanceId: string; occursOn: string; planName: string; groupName?: string | null };
type CalendarState = { accounts: Account[]; events: CalendarEvent[]; accountErrors: string[]; upcoming: RelayPlan[] };

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const [state, setState] = useState<CalendarState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  useEffect(() => { void load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [accountResult, eventResult, membershipResult] = await Promise.all([
      supabase.functions.invoke('mail-hub', { body: { action: 'accounts' } }),
      supabase.functions.invoke('mail-hub', { body: { action: 'calendar_events' } }),
      supabase.from('group_members').select('group_id').eq('user_id', user.id),
    ]);

    const groupIds = (membershipResult.data ?? []).map((membership) => membership.group_id);
    let upcoming: RelayPlan[] = [];

    if (groupIds.length) {
      const { data: plans } = await supabase.from('plans').select('id,name,group:groups(name),instances:plan_instances(id,occurs_on)').in('group_id', groupIds);
      const today = new Date().toISOString().slice(0, 10);
      upcoming = (plans ?? [])
        .flatMap((plan: any) => plan.instances
          .filter((instance: any) => instance.occurs_on >= today)
          .map((instance: any) => ({ instanceId: instance.id, occursOn: instance.occurs_on, planName: plan.name, groupName: plan.group?.name })))
        .sort((a: RelayPlan, b: RelayPlan) => a.occursOn.localeCompare(b.occursOn))
        .slice(0, 10);
    }

    setState({
      accounts: accountResult.data?.accounts ?? [],
      events: eventResult.data?.events ?? [],
      accountErrors: eventResult.data?.accountErrors ?? [],
      upcoming,
    });

    if (accountResult.error || eventResult.error) setError('Some calendar data could not load.');
  }

  async function refresh() {
    setBusy('refresh');
    setError(null);
    await load();
    setBusy(null);
  }

  async function connect(provider: Provider) {
    setBusy(provider);
    setError(null);
    const { data, error: invokeError } = await createClient().functions.invoke('mail-hub', { body: { action: 'connect_start', provider, next: '/calendar' } });
    if (invokeError || !data?.url) {
      setError(data?.error ?? `${provider === 'google' ? 'Google' : 'Microsoft'} OAuth is not configured yet.`);
      setBusy(null);
      return;
    }
    window.location.assign(data.url);
  }

  async function disconnect(account: Account) {
    if (!confirm(`Disconnect ${account.email_address} from Relay email and calendar?`)) return;
    setBusy(account.id);
    const { error: invokeError } = await createClient().functions.invoke('mail-hub', { body: { action: 'disconnect', accountId: account.id } });
    if (invokeError) {
      setError('Could not disconnect that account.');
      setBusy(null);
      return;
    }
    await load();
    setBusy(null);
  }

  if (!state) return <PageLoading />;

  const monthDays = buildMonthGrid(visibleMonth);
  const eventsByDay = groupEventsByDay(state.events);
  const selectedEvents = eventsByDay.get(dateKey(selectedDay)) ?? [];

  return <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
    <PageHeader title="Calendar" subtitle="Your Google, Microsoft, and Relay plans in one calendar." />

    <section className="mt-6 rounded-lg border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-ink">Calendar accounts</h2>
          <p className="mt-0.5 text-xs text-ink-faint">{state.accounts.length} of 3 connected · calendar and inbox are read-only</p>
        </div>
        <CalendarDays size={18} className="text-ink-faint" />
      </div>
      <p className="mt-2 text-xs leading-5 text-ink-muted">School email is okay here. Connecting it to Calendar or Email does not change the personal email you use to sign in to Relay.</p>

      {state.accounts.length > 0 && <ul className="mt-4 space-y-2">{state.accounts.map((account: Account) => {
        const needsReconnect = state.accountErrors.includes(account.email_address);
        return <li key={account.id} className="flex items-center gap-3 rounded-md bg-surface px-3 py-2.5">
          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${account.provider === 'google' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>{account.provider === 'google' ? 'G' : 'M'}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{account.email_address}</p>
            <p className={`text-xs ${needsReconnect ? 'text-amber-600' : 'text-ink-faint'}`}>{needsReconnect ? 'Reconnect to grant calendar access' : `${account.provider} calendar connected`}</p>
          </div>
          {needsReconnect && <button type="button" disabled={Boolean(busy)} onClick={() => void connect(account.provider)} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted" aria-label={`Reconnect ${account.email_address}`}><RefreshCw size={14} /></button>}
          <button type="button" disabled={busy === account.id} onClick={() => void disconnect(account)} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint" aria-label={`Disconnect ${account.email_address}`}><X size={15} /></button>
        </li>;
      })}</ul>}

      {state.accounts.length < 3 && <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={Boolean(busy)} onClick={() => void connect('google')} className="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"><Plus size={15} />{busy === 'google' ? 'Connecting…' : 'Add Google'}</button>
        <button type="button" disabled={Boolean(busy)} onClick={() => void connect('microsoft')} className="inline-flex items-center gap-2 rounded-md border border-border px-3.5 py-2.5 text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"><Plus size={15} />{busy === 'microsoft' ? 'Connecting…' : 'Add Microsoft'}</button>
      </div>}
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </section>
    <section className="mt-7 overflow-hidden rounded-lg border border-border bg-surface-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-faint">Connected calendars</p>
          <h2 className="mt-0.5 text-lg font-medium text-ink">{visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))} className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-surface" aria-label="Previous month"><ChevronLeft size={15} /></button>
          <button type="button" onClick={() => { const today = new Date(); setVisibleMonth(startOfMonth(today)); setSelectedDay(today); }} className="h-8 rounded-md border border-border px-3 text-xs font-medium text-ink hover:bg-surface">Today</button>
          <button type="button" onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))} className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-surface" aria-label="Next month"><ChevronRight size={15} /></button>
          <button type="button" disabled={busy === 'refresh'} onClick={() => void refresh()} className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-surface disabled:opacity-40" aria-label="Refresh calendar"><RefreshCw size={14} className={busy === 'refresh' ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-surface">
        {WEEKDAYS.map((day) => <div key={day} className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ink-faint sm:text-xs">{day}</div>)}
      </div>

      <div className="grid grid-cols-7">
        {monthDays.map((day) => {
          const key = dateKey(day);
          const dayEvents = eventsByDay.get(key) ?? [];
          const inMonth = day.getMonth() === visibleMonth.getMonth();
          const isToday = sameDay(day, new Date());
          const isSelected = sameDay(day, selectedDay);
          return <div key={key} className={`min-h-[78px] border-b border-r border-border p-1.5 sm:min-h-[108px] sm:p-2 ${inMonth ? 'bg-surface-raised' : 'bg-surface'} ${isSelected ? 'ring-1 ring-inset ring-border' : ''}`}>
            <button type="button" onClick={() => setSelectedDay(day)} className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[11px] font-medium sm:text-xs ${isToday ? 'bg-ink text-canvas' : inMonth ? 'text-ink' : 'text-ink-faint'}`} aria-label={`Select ${day.toLocaleDateString()}`}>{day.getDate()}</button>
            <div className="mt-1 space-y-1">
              {dayEvents.slice(0, 3).map((event) => <button key={event.id} type="button" onClick={() => setSelectedDay(day)} className="block w-full truncate rounded bg-surface px-1 py-0.5 text-left text-[9px] leading-4 text-ink-muted hover:text-ink sm:text-[10px]" title={event.summary}>
                <span className="hidden sm:inline">{event.isAllDay ? '' : `${formatTime(event.start)} · `}{event.summary}</span>
                <span className="sm:hidden">• {event.summary}</span>
              </button>)}
              {dayEvents.length > 3 && <p className="px-1 text-[9px] text-ink-faint">+{dayEvents.length - 3} more</p>}
            </div>
          </div>;
        })}
      </div>
    </section>

    <section className="mt-5 rounded-lg border border-border bg-surface-raised p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink-faint">Selected day</p>
          <h2 className="mt-1 text-base font-medium text-ink">{selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
        </div>
        <span className="text-xs text-ink-faint">{selectedEvents.length} {selectedEvents.length === 1 ? 'event' : 'events'}</span>
      </div>
      {selectedEvents.length === 0 ? <p className="mt-4 text-sm text-ink-faint">No connected-calendar events on this day.</p> : <ul className="mt-3 divide-y divide-border">{selectedEvents.map((event) => <li key={event.id} className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{event.summary}</p>
          <p className="mt-1 text-xs text-ink-muted">{formatEvent(event.start, event.isAllDay)}{event.end && ` · until ${formatEvent(event.end, event.isAllDay)}`}</p>
          <p className="mt-1 truncate text-[11px] text-ink-faint">{event.accountEmail}</p>
        </div>
        {event.htmlLink && <a href={event.htmlLink} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-ink-faint underline underline-offset-4">Open</a>}
      </li>)}</ul>}
    </section>

    {state.accounts.length > 0 && state.events.length === 0 && <p className="mt-4 rounded-md border border-border px-3 py-4 text-sm text-ink-faint">Your account is connected, but Relay did not receive any upcoming events. If this account was connected before calendar access was enabled, reconnect it once and approve Calendar access.</p>}

    <section className="mt-8">
      <div className="mb-3"><p className="text-xs uppercase tracking-wide text-ink-faint">Relay planning</p><h2 className="mt-1 text-lg font-medium text-ink">Group plans</h2></div>
      {state.upcoming.length === 0 ? <p className="text-sm text-ink-faint">No upcoming plans.</p> : <ul className="divide-y divide-border rounded-md border border-border">{state.upcoming.map((plan) => <li key={plan.instanceId} className="flex items-center justify-between px-3 py-2.5"><div><span className="text-sm text-ink">{plan.planName}</span><span className="ml-2 text-xs text-ink-faint">{plan.groupName}</span></div><span className="text-xs text-ink-faint">{new Date(`${plan.occursOn}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span></li>)}</ul>}
    </section>
  </div>;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function shiftMonth(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildMonthGrid(month: Date) {
  const first = startOfMonth(month);
  const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index));
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function eventDateKey(start: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return start;
  return dateKey(new Date(start));
}

function groupEventsByDay(events: CalendarEvent[]) {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = eventDateKey(event.start);
    const current = grouped.get(key) ?? [];
    current.push(event);
    grouped.set(key, current);
  }
  for (const dayEvents of grouped.values()) {
    dayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }
  return grouped;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(start: string) {
  return new Date(start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatEvent(start: string, allDay: boolean) {
  if (allDay && /^\d{4}-\d{2}-\d{2}$/.test(start)) {
    const [year, month, day] = start.split('-').map(Number);
    if (year !== undefined && month !== undefined && day !== undefined) {
      return new Date(year, month - 1, day).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
  }
  const date = new Date(start);
  return allDay ? date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}