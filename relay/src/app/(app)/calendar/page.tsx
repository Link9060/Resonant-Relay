'use client';

import { RelayEventDialog, type RelayCalendarEvent } from '@/components/calendar/relay-event-dialog';
import { ConnectedAccountsDialog, type ConnectedAccount, type IntegrationProvider } from '@/components/integrations/connected-accounts-dialog';
import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ProviderEvent = { id: string; summary: string; start: string; end?: string | null; isAllDay: boolean; htmlLink?: string | null; accountId: string; accountEmail: string; provider: IntegrationProvider; calendarName?: string | null };
type RelayPlan = { instanceId: string; occursOn: string; planName: string; groupName?: string | null; startTime?: string | null; endTime?: string | null };
type CalendarState = { accounts: ConnectedAccount[]; events: ProviderEvent[]; accountErrors: string[]; plans: RelayPlan[]; relayEvents: RelayCalendarEvent[] };
type CalendarItem = { id: string; title: string; dateKey: string; start: string; end?: string | null; isAllDay: boolean; sourceId: string; sourceLabel: string; href?: string | null; color: string; detail?: string | null; relayEvent?: RelayCalendarEvent | null };

type EditorState = { date: string; event?: RelayCalendarEvent | null };

const ACCOUNT_COLORS = ['#4f7ee8', '#e36d6d', '#9270dc'];
const RELAY_EVENT_COLOR = '#5f7f72';
const RELAY_PLAN_COLOR = '#7c8798';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const [state, setState] = useState<CalendarState | null>(null);
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dateKeyFromDate(new Date()));
  const [visibleSources, setVisibleSources] = useState<Set<string>>(new Set(['relay-events', 'relay-plans']));
  const [manageOpen, setManageOpen] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [monthDirection, setMonthDirection] = useState<-1 | 0 | 1>(0);

  useEffect(() => { void load(); }, []);

  async function load() {
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [accountResult, eventResult, membershipResult, relayEventResult] = await Promise.all([
      supabase.functions.invoke('calendar-hub', { body: { action: 'accounts' } }),
      supabase.functions.invoke('calendar-hub', { body: { action: 'calendar_events' } }),
      supabase.from('group_members').select('group_id').eq('user_id', user.id),
      supabase.from('relay_calendar_events').select('*').eq('user_id', user.id).order('event_date').order('start_time'),
    ]);

    const groupIds = (membershipResult.data ?? []).map((membership: any) => membership.group_id);
    let plans: RelayPlan[] = [];
    if (groupIds.length) {
      const { data } = await supabase
        .from('plans')
        .select('id,name,start_time,end_time,group:groups(name),instances:plan_instances(id,occurs_on)')
        .in('group_id', groupIds);
      plans = (data ?? []).flatMap((plan: any) => (plan.instances ?? []).map((instance: any) => ({
        instanceId: instance.id,
        occursOn: instance.occurs_on,
        planName: plan.name,
        groupName: plan.group?.name,
        startTime: plan.start_time,
        endTime: plan.end_time,
      })));
    }

    const accounts: ConnectedAccount[] = accountResult.data?.accounts ?? [];
    setState({
      accounts,
      events: eventResult.data?.events ?? [],
      accountErrors: eventResult.data?.accountErrors ?? [],
      plans,
      relayEvents: relayEventResult.data ?? [],
    });
    setVisibleSources(new Set(['relay-events', 'relay-plans', ...accounts.map((account) => account.id)]));
    if (accountResult.error || eventResult.error || relayEventResult.error) setError('Some calendar data could not load. Relay events require the 1.0.7 database migration.');
  }

  async function connect(provider: IntegrationProvider) {
    setBusy(provider);
    setError(null);
    const { data, error: invokeError } = await createClient().functions.invoke('calendar-hub', { body: { action: 'connect_start', provider, next: '/calendar' } });
    if (invokeError || !data?.url) {
      setError(data?.error ?? `${provider === 'google' ? 'Google' : 'Microsoft'} OAuth is not configured yet.`);
      setBusy(null);
      return;
    }
    window.location.assign(data.url);
  }

  async function disconnect(account: ConnectedAccount) {
    if (!window.confirm(`Disconnect ${account.email_address} from Relay Calendar?`)) return;
    setBusy(account.id);
    setError(null);
    const { error: invokeError } = await createClient().functions.invoke('calendar-hub', { body: { action: 'disconnect', accountId: account.id } });
    if (invokeError) {
      setError('Could not disconnect that account.');
      setBusy(null);
      return;
    }
    await load();
    setBusy(null);
  }

  async function deleteRelayEvent(event: RelayCalendarEvent) {
    if (!window.confirm(`Delete “${event.title}” from your Relay calendar?`)) return;
    setBusy(`event:${event.id}`);
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(null); return; }
    const { error: deleteError } = await supabase.from('relay_calendar_events').delete().eq('id', event.id).eq('user_id', user.id);
    setBusy(null);
    if (deleteError) {
      setError('That Relay event could not be deleted.');
      return;
    }
    setState((current) => current ? { ...current, relayEvents: current.relayEvents.filter((item) => item.id !== event.id) } : current);
  }

  function handleSaved(saved: RelayCalendarEvent) {
    setState((current) => {
      if (!current) return current;
      const exists = current.relayEvents.some((item) => item.id === saved.id);
      return {
        ...current,
        relayEvents: exists
          ? current.relayEvents.map((item) => item.id === saved.id ? saved : item)
          : [...current.relayEvents, saved],
      };
    });
    setSelectedDate(saved.event_date);
    setViewDate(startOfMonth(new Date(`${saved.event_date}T12:00:00`)));
    setVisibleSources((current) => new Set([...current, 'relay-events']));
    setEditor(null);
  }

  const calendarItems = useMemo<CalendarItem[]>(() => {
    if (!state) return [];
    const accountColor = new Map(state.accounts.map((account, index) => [account.id, ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] ?? '#4f7ee8']));
    return [
      ...state.events.map((event) => ({
        id: event.id,
        title: event.summary || 'Untitled event',
        dateKey: dateKeyFromRaw(event.start, event.isAllDay),
        start: event.start,
        end: event.end,
        isAllDay: event.isAllDay,
        sourceId: event.accountId,
        sourceLabel: event.calendarName ? `${event.calendarName} · ${event.accountEmail}` : event.accountEmail,
        href: event.htmlLink,
        color: accountColor.get(event.accountId) ?? '#4f7ee8',
      })),
      ...state.relayEvents.map((event) => ({
        id: `relay-event:${event.id}`,
        title: event.title,
        dateKey: event.event_date,
        start: event.start_time ? `${event.event_date}T${event.start_time}` : event.event_date,
        end: event.end_time ? `${event.event_date}T${event.end_time}` : null,
        isAllDay: event.is_all_day,
        sourceId: 'relay-events',
        sourceLabel: 'Relay Calendar',
        color: RELAY_EVENT_COLOR,
        detail: event.details,
        relayEvent: event,
      })),
      ...state.plans.map((plan) => ({
        id: `relay-plan:${plan.instanceId}`,
        title: plan.planName,
        dateKey: plan.occursOn,
        start: plan.startTime ? `${plan.occursOn}T${plan.startTime}` : plan.occursOn,
        end: plan.startTime && plan.endTime ? `${plan.occursOn}T${plan.endTime}` : null,
        isAllDay: !plan.startTime,
        sourceId: 'relay-plans',
        sourceLabel: 'Relay Plans',
        color: RELAY_PLAN_COLOR,
        detail: plan.groupName,
      })),
    ];
  }, [state]);

  const visibleItems = useMemo(() => calendarItems.filter((item) => visibleSources.has(item.sourceId)), [calendarItems, visibleSources]);
  const monthDays = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const selectedItems = useMemo(() => visibleItems.filter((item) => item.dateKey === selectedDate).sort((a, b) => a.start.localeCompare(b.start)), [selectedDate, visibleItems]);

  function toggleSource(sourceId: string) {
    setVisibleSources((current) => {
      const next = new Set(current);
      if (next.has(sourceId)) next.delete(sourceId); else next.add(sourceId);
      return next;
    });
  }

  function goToMonth(offset: number) {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1, 12);
    setMonthDirection(offset < 0 ? -1 : 1);
    setViewDate(next);
    setSelectedDate(dateKeyFromDate(next));
    window.setTimeout(() => setMonthDirection(0), 320);
  }

  function goToToday() {
    const today = new Date();
    setMonthDirection(0);
    setViewDate(startOfMonth(today));
    setSelectedDate(dateKeyFromDate(today));
  }

  if (!state) return <PageLoading />;

  const sources = [
    ...state.accounts.map((account, index) => ({ id: account.id, label: account.email_address, sublabel: account.provider === 'google' ? 'Google Calendar · read only' : 'Microsoft Calendar · read only', color: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] ?? '#4f7ee8' })),
    { id: 'relay-events', label: 'Relay Calendar', sublabel: 'Private · editable', color: RELAY_EVENT_COLOR },
    { id: 'relay-plans', label: 'Relay Plans', sublabel: 'Group schedules', color: RELAY_PLAN_COLOR },
  ];

  return <div className="mx-auto max-w-[100rem] px-4 py-8 md:px-6">
    <PageHeader
      title="Calendar"
      subtitle="Create private Relay events while keeping connected calendars read-only."
      action={<div className="flex items-center gap-2"><button type="button" onClick={() => setEditor({ date: selectedDate })} className="inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-canvas"><Plus size={16} /> New event</button><button type="button" onClick={() => setManageOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"><Settings2 size={16} /> Calendars</button></div>}
    />
    {error && !manageOpen && <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">{error}</div>}
    {state.accountErrors.length > 0 && !manageOpen && (
      <button type="button" onClick={() => setManageOpen(true)} className="mt-5 flex w-full items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-left text-sm text-amber-700 dark:text-amber-300">
        <RefreshCw size={16} className="shrink-0" />
        <span className="flex-1"><strong>Reconnect Calendar once.</strong> Relay’s permissions are now calendar-only, so older connections need a quick refresh before Relay can use them again.</span>
        <span className="text-xs font-semibold">Fix</span>
      </button>
    )}

    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-canvas shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink"><ChevronLeft size={17} /></button>
          <button type="button" onClick={goToToday} className="rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-surface">Today</button>
          <button type="button" onClick={() => goToMonth(1)} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink"><ChevronRight size={17} /></button>
        </div>
        <h2 key={viewDate.toISOString()} className="relay-motion-crossfade text-base font-semibold text-ink md:text-lg">{viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <span className="hidden text-xs text-ink-faint sm:block">{visibleSources.size} calendars shown</span>
      </div>

      <div className="border-b border-border p-3 xl:hidden"><div className="flex gap-2 overflow-x-auto">{sources.map((source) => <button key={source.id} type="button" onClick={() => toggleSource(source.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity ${visibleSources.has(source.id) ? 'border-border text-ink' : 'border-transparent bg-surface text-ink-faint opacity-60'}`}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }} />{source.label}</button>)}</div></div>

      <div className="grid xl:grid-cols-[14rem_minmax(0,1fr)_19rem]">
        <aside className="hidden border-r border-border bg-surface/50 p-4 xl:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">My calendars</p>
          <div className="mt-3 space-y-1">{sources.map((source) => <label key={source.id} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 hover:bg-surface">
            <input type="checkbox" checked={visibleSources.has(source.id)} onChange={() => toggleSource(source.id)} className="sr-only" />
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-sm border transition-transform ${visibleSources.has(source.id) ? 'border-transparent scale-100' : 'border-border bg-transparent scale-90'}`} style={visibleSources.has(source.id) ? { backgroundColor: source.color } : undefined} />
            <span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{source.label}</span><span className="mt-0.5 block text-xs text-ink-faint">{source.sublabel}</span></span>
          </label>)}</div>
          <button type="button" onClick={() => setVisibleSources(visibleSources.size === sources.length ? new Set() : new Set(sources.map((source) => source.id)))} className="mt-4 px-2 text-xs font-medium text-ink-muted underline underline-offset-4">{visibleSources.size === sources.length ? 'Hide all' : 'Show all'}</button>
        </aside>

        <div className="min-w-0 overflow-x-auto">
          <div key={`${viewDate.getFullYear()}-${viewDate.getMonth()}`} className={`min-w-[44rem] ${monthDirection === 1 ? 'relay-motion-calendar-forward' : monthDirection === -1 ? 'relay-motion-calendar-back' : ''}`}>
            <div className="grid grid-cols-7 border-b border-border bg-surface/40">{WEEKDAYS.map((day) => <div key={day} className="px-2 py-2 text-center text-xs font-medium text-ink-faint">{day}</div>)}</div>
            <div className="grid grid-cols-7">{monthDays.map((date) => {
              const key = dateKeyFromDate(date);
              const items = visibleItems.filter((item) => item.dateKey === key);
              const inMonth = date.getMonth() === viewDate.getMonth();
              const isToday = key === dateKeyFromDate(new Date());
              const selected = key === selectedDate;
              return <button key={key} type="button" onClick={() => setSelectedDate(key)} className={`min-h-28 border-b border-r border-border p-1.5 text-left align-top transition-[background-color,transform] duration-200 hover:bg-surface/70 ${selected ? 'bg-surface' : ''}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs transition-transform ${isToday ? 'bg-ink font-semibold text-canvas' : inMonth ? 'text-ink' : 'text-ink-faint'} ${selected ? 'scale-105' : ''}`}>{date.getDate()}</span>
                <span className="mt-1 block space-y-1">{items.slice(0, 3).map((item) => <span key={item.id} className="block truncate rounded px-1.5 py-1 text-xs font-medium text-ink" style={{ backgroundColor: `${item.color}22`, borderLeft: `2px solid ${item.color}` }}>{!item.isAllDay && `${formatTime(item.start)} `}{item.title}</span>)}{items.length > 3 && <span className="block px-1 text-xs text-ink-faint">+{items.length - 3} more</span>}</span>
              </button>;
            })}</div>
          </div>
        </div>

        <aside className="border-t border-border p-4 xl:border-l xl:border-t-0">
          <div key={selectedDate} className="relay-motion-crossfade">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Selected day</p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-ink">{formatSelectedDate(selectedDate)}</h3>
              <button type="button" onClick={() => setEditor({ date: selectedDate })} aria-label="Add Relay event" title="Add Relay event" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-surface"><Plus size={15} /></button>
            </div>
            {selectedItems.length ? <ul className="mt-4 space-y-2">{selectedItems.map((item) => <li key={item.id} className="rounded-lg border border-border bg-surface/60 p-3" style={{ borderLeftColor: item.color, borderLeftWidth: 3 }}>
              <p className="text-sm font-medium text-ink">{item.title}</p>
              <p className="mt-1 text-xs text-ink-muted">{item.isAllDay ? 'All day' : formatEventRange(item.start, item.end)}</p>
              <p className="mt-2 truncate text-xs text-ink-faint">{item.sourceLabel}{item.detail ? ` · ${item.detail}` : ''}</p>
              {item.href && <a href={item.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink underline underline-offset-4">Open event <ExternalLink size={12} /></a>}
              {item.relayEvent && <div className="mt-3 flex gap-2"><button type="button" onClick={() => setEditor({ date: item.dateKey, event: item.relayEvent })} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-canvas"><Pencil size={12} /> Edit</button><button type="button" disabled={busy === `event:${item.relayEvent.id}`} onClick={() => void deleteRelayEvent(item.relayEvent!)} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50"><Trash2 size={12} /> {busy === `event:${item.relayEvent.id}` ? 'Deleting…' : 'Delete'}</button></div>}
            </li>)}</ul> : <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center"><CalendarDays size={20} className="mx-auto text-ink-faint" /><p className="mt-2 text-sm text-ink-faint">Nothing scheduled.</p><button type="button" onClick={() => setEditor({ date: selectedDate })} className="mt-3 text-xs font-medium text-ink underline underline-offset-4">Add a Relay event</button></div>}
          </div>
        </aside>
      </div>
    </section>

    {manageOpen && <ConnectedAccountsDialog accounts={state.accounts} busy={busy} error={error} title="Calendar accounts" accountErrors={state.accountErrors} onClose={() => setManageOpen(false)} onConnect={(provider) => void connect(provider)} onDisconnect={(account) => void disconnect(account)} />}
    {editor && <RelayEventDialog date={editor.date} event={editor.event} onClose={() => setEditor(null)} onSaved={handleSaved} />}
  </div>;
}

function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1, 12); }
function dateKeyFromDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function dateKeyFromRaw(raw: string, allDay: boolean) { if (allDay && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10); return dateKeyFromDate(new Date(raw)); }
function buildMonthGrid(month: Date) { const first = startOfMonth(month); const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay(), 12); return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12)); }
function formatSelectedDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); }
function formatTime(value: string) { return new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
function formatEventRange(start: string, end?: string | null) { const startLabel = formatTime(start); if (!end) return startLabel; return `${startLabel}–${formatTime(end)}`; }
