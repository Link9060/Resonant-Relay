'use client';

import { ConnectedAccountsDialog, type ConnectedAccount, type IntegrationProvider } from '@/components/integrations/connected-accounts-dialog';
import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ProviderEvent = { id: string; summary: string; start: string; end?: string | null; isAllDay: boolean; htmlLink?: string | null; accountId: string; accountEmail: string; provider: IntegrationProvider };
type RelayPlan = { instanceId: string; occursOn: string; planName: string; groupName?: string | null };
type CalendarState = { accounts: ConnectedAccount[]; events: ProviderEvent[]; accountErrors: string[]; plans: RelayPlan[] };
type CalendarItem = { id: string; title: string; dateKey: string; start: string; end?: string | null; isAllDay: boolean; sourceId: string; sourceLabel: string; href?: string | null; color: string; detail?: string | null };

const ACCOUNT_COLORS = ['#4f7ee8', '#e36d6d', '#9270dc'];
const RELAY_COLOR = '#7c8798';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const [state, setState] = useState<CalendarState | null>(null);
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => dateKeyFromDate(new Date()));
  const [visibleSources, setVisibleSources] = useState<Set<string>>(new Set(['relay']));
  const [manageOpen, setManageOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    let plans: RelayPlan[] = [];
    if (groupIds.length) {
      const { data } = await supabase.from('plans').select('id,name,group:groups(name),instances:plan_instances(id,occurs_on)').in('group_id', groupIds);
      plans = (data ?? []).flatMap((plan: any) => (plan.instances ?? []).map((instance: any) => ({ instanceId: instance.id, occursOn: instance.occurs_on, planName: plan.name, groupName: plan.group?.name })));
    }
    const accounts: ConnectedAccount[] = accountResult.data?.accounts ?? [];
    setState({ accounts, events: eventResult.data?.events ?? [], accountErrors: eventResult.data?.accountErrors ?? [], plans });
    setVisibleSources(new Set(['relay', ...accounts.map((account) => account.id)]));
    if (accountResult.error || eventResult.error) setError('Some calendar data could not load.');
  }

  async function connect(provider: IntegrationProvider) {
    setBusy(provider); setError(null);
    const { data, error: invokeError } = await createClient().functions.invoke('mail-hub', { body: { action: 'connect_start', provider, next: '/calendar' } });
    if (invokeError || !data?.url) { setError(data?.error ?? `${provider === 'google' ? 'Google' : 'Microsoft'} OAuth is not configured yet.`); setBusy(null); return; }
    window.location.assign(data.url);
  }

  async function disconnect(account: ConnectedAccount) {
    if (!window.confirm(`Disconnect ${account.email_address} from Relay email and calendar?`)) return;
    setBusy(account.id); setError(null);
    const { error: invokeError } = await createClient().functions.invoke('mail-hub', { body: { action: 'disconnect', accountId: account.id } });
    if (invokeError) { setError('Could not disconnect that account.'); setBusy(null); return; }
    await load(); setBusy(null);
  }

  const calendarItems = useMemo<CalendarItem[]>(() => {
    if (!state) return [];
    const accountColor = new Map(state.accounts.map((account, index) => [account.id, ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] ?? ACCOUNT_COLORS[0] ?? '#4f7ee8']));
    return [
      ...state.events.map((event) => ({ id: event.id, title: event.summary || 'Untitled event', dateKey: dateKeyFromRaw(event.start, event.isAllDay), start: event.start, end: event.end, isAllDay: event.isAllDay, sourceId: event.accountId, sourceLabel: event.accountEmail, href: event.htmlLink, color: accountColor.get(event.accountId) ?? '#4f7ee8' })),
      ...state.plans.map((plan) => ({ id: `relay:${plan.instanceId}`, title: plan.planName, dateKey: plan.occursOn, start: plan.occursOn, isAllDay: true, sourceId: 'relay', sourceLabel: 'Relay Plans', color: RELAY_COLOR, detail: plan.groupName })),
    ];
  }, [state]);

  const visibleItems = useMemo(() => calendarItems.filter((item) => visibleSources.has(item.sourceId)), [calendarItems, visibleSources]);
  const monthDays = useMemo(() => buildMonthGrid(viewDate), [viewDate]);
  const selectedItems = useMemo(() => visibleItems.filter((item) => item.dateKey === selectedDate).sort((a, b) => a.start.localeCompare(b.start)), [selectedDate, visibleItems]);

  function toggleSource(sourceId: string) {
    setVisibleSources((current) => { const next = new Set(current); if (next.has(sourceId)) next.delete(sourceId); else next.add(sourceId); return next; });
  }

  function goToMonth(offset: number) {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1, 12);
    setViewDate(next);
    setSelectedDate(dateKeyFromDate(next));
  }

  function goToToday() { const today = new Date(); setViewDate(startOfMonth(today)); setSelectedDate(dateKeyFromDate(today)); }

  if (!state) return <PageLoading />;

  const sources = [
    ...state.accounts.map((account, index) => ({ id: account.id, label: account.email_address, sublabel: account.provider === 'google' ? 'Google Calendar' : 'Microsoft Calendar', color: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length] ?? '#4f7ee8' })),
    { id: 'relay', label: 'Relay Plans', sublabel: 'Group schedules', color: RELAY_COLOR },
  ];

  return <div className="mx-auto max-w-[100rem] px-4 py-8 md:px-6">
    <PageHeader title="Calendar" subtitle="Your calendars and Relay plans in one view." action={<button type="button" onClick={() => setManageOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"><Settings2 size={16} /> Calendars</button>} />
    {error && !manageOpen && <div className="mt-5 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">{error}</div>}

    <section className="mt-6 overflow-hidden rounded-xl border border-border bg-canvas shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => goToMonth(-1)} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink"><ChevronLeft size={17} /></button>
          <button type="button" onClick={goToToday} className="rounded-md px-3 py-2 text-sm font-medium text-ink hover:bg-surface">Today</button>
          <button type="button" onClick={() => goToMonth(1)} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink"><ChevronRight size={17} /></button>
        </div>
        <h2 className="text-base font-semibold text-ink md:text-lg">{viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <span className="hidden text-xs text-ink-faint sm:block">{visibleSources.size} calendars shown</span>
      </div>

      <div className="border-b border-border p-3 xl:hidden"><div className="flex gap-2 overflow-x-auto">{sources.map((source) => <button key={source.id} type="button" onClick={() => toggleSource(source.id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity ${visibleSources.has(source.id) ? 'border-border text-ink' : 'border-transparent bg-surface text-ink-faint opacity-60'}`}><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }} />{source.label}</button>)}</div></div>

      <div className="grid xl:grid-cols-[14rem_minmax(0,1fr)_19rem]">
        <aside className="hidden border-r border-border bg-surface/50 p-4 xl:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">My calendars</p>
          <div className="mt-3 space-y-1">{sources.map((source) => <label key={source.id} className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 hover:bg-surface">
            <input type="checkbox" checked={visibleSources.has(source.id)} onChange={() => toggleSource(source.id)} className="sr-only" />
            <span className={`mt-1 h-3 w-3 shrink-0 rounded-sm border ${visibleSources.has(source.id) ? 'border-transparent' : 'border-border bg-transparent'}`} style={visibleSources.has(source.id) ? { backgroundColor: source.color } : undefined} />
            <span className="min-w-0"><span className="block truncate text-sm font-medium text-ink">{source.label}</span><span className="mt-0.5 block text-xs text-ink-faint">{source.sublabel}</span></span>
          </label>)}</div>
          <button type="button" onClick={() => setVisibleSources(visibleSources.size === sources.length ? new Set() : new Set(sources.map((source) => source.id)))} className="mt-4 px-2 text-xs font-medium text-ink-muted underline underline-offset-4">{visibleSources.size === sources.length ? 'Hide all' : 'Show all'}</button>
        </aside>

        <div className="min-w-0 overflow-x-auto">
          <div className="min-w-[44rem]">
            <div className="grid grid-cols-7 border-b border-border bg-surface/40">{WEEKDAYS.map((day) => <div key={day} className="px-2 py-2 text-center text-xs font-medium text-ink-faint">{day}</div>)}</div>
            <div className="grid grid-cols-7">{monthDays.map((date) => {
              const key = dateKeyFromDate(date);
              const items = visibleItems.filter((item) => item.dateKey === key);
              const inMonth = date.getMonth() === viewDate.getMonth();
              const isToday = key === dateKeyFromDate(new Date());
              const selected = key === selectedDate;
              return <button key={key} type="button" onClick={() => setSelectedDate(key)} className={`min-h-28 border-b border-r border-border p-1.5 text-left align-top transition-colors hover:bg-surface/70 ${selected ? 'bg-surface' : ''}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${isToday ? 'bg-ink font-semibold text-canvas' : inMonth ? 'text-ink' : 'text-ink-faint'}`}>{date.getDate()}</span>
                <span className="mt-1 block space-y-1">{items.slice(0, 3).map((item) => <span key={item.id} className="block truncate rounded px-1.5 py-1 text-xs font-medium text-ink" style={{ backgroundColor: `${item.color}22`, borderLeft: `2px solid ${item.color}` }}>{!item.isAllDay && `${formatTime(item.start)} `}{item.title}</span>)}{items.length > 3 && <span className="block px-1 text-xs text-ink-faint">+{items.length - 3} more</span>}</span>
              </button>;
            })}</div>
          </div>
        </div>

        <aside className="border-t border-border p-4 xl:border-l xl:border-t-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Selected day</p>
          <h3 className="mt-2 text-lg font-semibold text-ink">{formatSelectedDate(selectedDate)}</h3>
          {selectedItems.length ? <ul className="mt-4 space-y-2">{selectedItems.map((item) => <li key={item.id} className="rounded-lg border border-border bg-surface/60 p-3" style={{ borderLeftColor: item.color, borderLeftWidth: 3 }}>
            <p className="text-sm font-medium text-ink">{item.title}</p>
            <p className="mt-1 text-xs text-ink-muted">{item.isAllDay ? 'All day' : formatEventRange(item.start, item.end)}</p>
            <p className="mt-2 truncate text-xs text-ink-faint">{item.sourceLabel}{item.detail ? ` · ${item.detail}` : ''}</p>
            {item.href && <a href={item.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-ink underline underline-offset-4">Open event <ExternalLink size={12} /></a>}
          </li>)}</ul> : <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center"><CalendarDays size={20} className="mx-auto text-ink-faint" /><p className="mt-2 text-sm text-ink-faint">Nothing scheduled.</p></div>}
        </aside>
      </div>
    </section>

    {manageOpen && <ConnectedAccountsDialog accounts={state.accounts} busy={busy} error={error} title="Calendar accounts" accountErrors={state.accountErrors} onClose={() => setManageOpen(false)} onConnect={(provider) => void connect(provider)} onDisconnect={(account) => void disconnect(account)} />}
  </div>;
}

function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1, 12); }
function dateKeyFromDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function dateKeyFromRaw(raw: string, allDay: boolean) { if (allDay && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10); return dateKeyFromDate(new Date(raw)); }
function buildMonthGrid(month: Date) { const first = startOfMonth(month); const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay(), 12); return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12)); }
function formatTime(raw: string) { const date = new Date(raw); return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
function formatEventRange(start: string, end?: string | null) { const startLabel = formatTime(start); if (!end) return startLabel; return `${startLabel} – ${formatTime(end)}`; }
function formatSelectedDate(key: string) { const [year = 2000, month = 1, day = 1] = key.split('-').map(Number); return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }); }
