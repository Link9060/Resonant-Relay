'use client';

import { PageLoading } from '@/components/page-loading';
import { LayoutControls } from '@/components/profile/layout-controls';
import { createTodo, setTodoCompleted } from '@/lib/actions/todos';
import { markNotificationRead } from '@/lib/actions/notifications';
import { appPageUrl, normalizeAppLink } from '@/lib/config';
import { localDateKey } from '@/lib/date';
import {
  DASHBOARD_LAYOUT_EVENT,
  DASHBOARD_LAYOUT_KEY,
  DEFAULT_DASHBOARD_LAYOUT,
  dashboardSpan,
  normalizeDashboardLayout,
  readDashboardLayout,
  saveDashboardLayout,
  type DashboardWidgetId,
  type DashboardWidgetPreference,
  type DashboardWidgetSize,
} from '@/lib/dashboard-layout';
import { readLayout, saveLayout, type RelayLayout } from '@/lib/layout-mode';
import { createClient } from '@/lib/supabase/client';
import type { Notification, Todo } from '@/lib/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  CircleUserRound,
  CloudSun,
  FileClock,
  Gauge,
  GripVertical,
  Headphones,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  MessageCircle,
  Mic,
  Music2,
  NotebookPen,
  Pause,
  Play,
  Plus,
  RotateCcw,
  School,
  Send,
  Sparkles,
  Sun,
  TimerReset,
  Users,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';

type DashboardEvent = {
  id: string;
  title: string;
  startsAt: string;
  source: string;
  href: string | null;
  external?: boolean;
};

type InboxMessage = {
  id: string;
  subject: string;
  from: string;
  receivedAt: string | null;
  isUnread: boolean;
};

type DashboardState = {
  userId: string;
  firstName: string | null;
  todos: Todo[];
  events: DashboardEvent[];
  emails: InboxMessage[];
  chatNotifications: Notification[];
  emailConnected: boolean;
  calendarConnected: boolean;
  taskError: boolean;
};

type WeatherSnapshot = {
  temperature: number;
  apparent: number;
  weatherCode: number;
  high: number;
  low: number;
  precip: number;
  sunrise: string;
  sunset: string;
  unit: string;
  fetchedAt: string;
};

const WEATHER_CACHE_KEY = 'relay-dashboard-weather-v1';
const QUICK_NOTE_KEY = 'relay-dashboard-quick-note-v1';

const WIDGET_META: Record<DashboardWidgetId, { label: string; description: string }> = {
  overview: { label: 'Daily overview', description: 'Tasks, upcoming items, and unread chats.' },
  weather: { label: 'Weather', description: 'Local conditions, high/low, rain chance, and sun times.' },
  tasks: { label: 'To-Do', description: 'Today’s checklist with quick add.' },
  calendar: { label: 'Next Up', description: 'Your next plans and calendar events.' },
  today: { label: 'Today', description: 'A compact timeline of what matters today.' },
  email: { label: 'Inbox', description: 'Recent mail from connected accounts.' },
  chats: { label: 'Chats', description: 'Newest Relay conversations and unread messages.' },
  quicknote: { label: 'Quick Note', description: 'Capture a thought and send it into Relay Notes.' },
  focus: { label: 'Focus', description: 'A simple focus timer with quick presets.' },
  nowplaying: { label: 'Now Playing', description: 'Music controls when a music connector is enabled.' },
  pinnedpeople: { label: 'Pinned People', description: 'Fast access to your favorite Relay contacts.' },
  quicklinks: { label: 'Quick Actions', description: 'Create tasks, plans, chats, or notes fast.' },
  dayprogress: { label: 'Day Progress', description: 'A glanceable progress meter for your day.' },
  schoolschedule: { label: 'School Schedule', description: 'Classes and school events pulled from Calendar.' },
  assignments: { label: 'Assignments', description: 'Upcoming dated To-Do items.' },
  momentum: { label: 'Momentum', description: 'Today’s completed-vs-total task progress.' },
  sun: { label: 'Sunrise / Sunset', description: 'Today’s sunrise and sunset from local weather.' },
  countdowns: { label: 'Countdowns', description: 'Time until your next event.' },
  recentfiles: { label: 'Recent Files', description: 'A home for recent Relay and connected files.' },
  ravinbrief: { label: 'RAVIN Brief', description: 'A preview of your future AI daily briefing.' },
  askravin: { label: 'Ask RAVIN', description: 'A teaser prompt box with the RAVIN voice orb.' },
};

const SIZE_LABELS: Record<DashboardWidgetSize, string> = {
  small: 'Small',
  medium: 'Medium',
  wide: 'Wide',
};

function cloneWidgets(items: DashboardWidgetPreference[]) {
  return items.map((widget) => ({ ...widget }));
}

function readCachedWeather(): WeatherSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherSnapshot;
    if (!parsed || typeof parsed.temperature !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function readQuickNote() {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem(QUICK_NOTE_KEY) ?? ''; } catch { return ''; }
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [isDesktop, setIsDesktop] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidgetPreference[]>(() => cloneWidgets(DEFAULT_DASHBOARD_LAYOUT));
  const [editBaseline, setEditBaseline] = useState<DashboardWidgetPreference[] | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<RelayLayout>('classic');
  const [layoutBaseline, setLayoutBaseline] = useState<RelayLayout | null>(null);
  const [draggingWidget, setDraggingWidget] = useState<DashboardWidgetId | null>(null);

  const [taskDraft, setTaskDraft] = useState('');
  const [taskBusy, setTaskBusy] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);
  const [freshTaskId, setFreshTaskId] = useState<string | null>(null);
  const [completedPulseId, setCompletedPulseId] = useState<string | null>(null);
  const [freshNotificationId, setFreshNotificationId] = useState<string | null>(null);

  const [weather, setWeather] = useState<WeatherSnapshot | null>(() => readCachedWeather());
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [weatherMessage, setWeatherMessage] = useState<string | null>(null);

  const [quickNote, setQuickNote] = useState(() => readQuickNote());
  const [quickNoteStatus, setQuickNoteStatus] = useState<string | null>(null);

  const [focusSeconds, setFocusSeconds] = useState(25 * 60);
  const [focusRunning, setFocusRunning] = useState(false);

  const [ravinPrompt, setRavinPrompt] = useState('');
  const [ravinMessage, setRavinMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!focusRunning || focusSeconds <= 0) return;
    const timer = window.setInterval(() => setFocusSeconds((value) => Math.max(0, value - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [focusRunning, focusSeconds]);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const syncDesktop = () => setIsDesktop(media.matches);
    syncDesktop();
    media.addEventListener('change', syncDesktop);
    return () => media.removeEventListener('change', syncDesktop);
  }, []);

  useEffect(() => {
    const sync = () => {
      if (!editingDashboard) setWidgets(readDashboardLayout());
    };
    sync();
    const storage = (event: StorageEvent) => {
      if (!event.key || event.key === DASHBOARD_LAYOUT_KEY) sync();
    };
    window.addEventListener('storage', storage);
    window.addEventListener(DASHBOARD_LAYOUT_EVENT, sync);
    return () => {
      window.removeEventListener('storage', storage);
      window.removeEventListener(DASHBOARD_LAYOUT_EVENT, sync);
    };
  }, [editingDashboard]);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    let notificationChannel: RealtimeChannel | null = null;

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const today = localDateKey();

      const [profileResult, todoResult, notificationResult, membershipResult, emailAccounts, calendarStatus] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('id', user.id).single(),
        supabase.from('todos').select('*').eq('user_id', user.id).gte('due_on', today).order('due_on').order('completed').order('position').limit(40),
        supabase.from('notifications').select('*').eq('user_id', user.id).eq('type', 'new_message').order('created_at', { ascending: false }).limit(4),
        supabase.from('group_members').select('group_id').eq('user_id', user.id),
        supabase.functions.invoke('mail-hub', { body: { action: 'accounts' } }),
        supabase.functions.invoke('mail-hub', { body: { action: 'calendar_events' } }),
      ]);

      const groupIds = (membershipResult.data ?? []).map((membership) => membership.group_id);
      const accountCount = emailAccounts.data?.accounts?.length ?? 0;
      const emailConnected = !emailAccounts.error && accountCount > 0;
      const calendarAccountErrors = calendarStatus.data?.accountErrors?.length ?? 0;
      const calendarConnected = emailConnected && !calendarStatus.error && calendarAccountErrors < accountCount;

      const [planResult, emailResult, calendarResult] = await Promise.all([
        groupIds.length
          ? supabase.from('plans').select('id,name,group:groups(name),instances:plan_instances(id,occurs_on)').in('group_id', groupIds)
          : Promise.resolve({ data: [], error: null }),
        emailConnected
          ? supabase.functions.invoke('mail-hub', { body: { action: 'messages' } })
          : Promise.resolve({ data: { messages: [] }, error: null }),
        calendarConnected
          ? Promise.resolve(calendarStatus)
          : Promise.resolve({ data: { events: [] }, error: null }),
      ]);

      const relayEvents: DashboardEvent[] = (planResult.data ?? []).flatMap((plan: any) =>
        (plan.instances ?? [])
          .filter((instance: any) => instance.occurs_on >= today)
          .map((instance: any) => ({
            id: `relay-${instance.id}`,
            title: plan.name,
            startsAt: `${instance.occurs_on}T12:00:00`,
            source: plan.group?.name ?? 'Relay plan',
            href: `/planner/view/?id=${encodeURIComponent(plan.id)}`,
          })),
      );
      const calendarEvents: DashboardEvent[] = (calendarResult.data?.events ?? []).map((event: any) => ({
        id: `calendar-${event.id}`,
        title: event.summary,
        startsAt: event.isAllDay ? `${event.start}T12:00:00` : event.start,
        source: event.accountEmail ?? `${event.provider === 'microsoft' ? 'Microsoft' : 'Google'} Calendar`,
        href: event.htmlLink || null,
        external: true,
      }));

      if (!active) return;
      setState({
        userId: user.id,
        firstName: profileResult.data?.display_name?.split(' ')[0] ?? null,
        todos: todoResult.data ?? [],
        events: [...relayEvents, ...calendarEvents]
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
          .slice(0, 12),
        emails: (emailResult.data?.messages ?? []).slice(0, 5),
        chatNotifications: notificationResult.data ?? [],
        emailConnected,
        calendarConnected,
        taskError: Boolean(todoResult.error),
      });

      notificationChannel = supabase
        .channel(`dashboard-notifications:${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
          if (payload.eventType === 'DELETE') {
            const removed = payload.old as { id?: string };
            if (!removed.id) return;
            setState((current) => current ? { ...current, chatNotifications: current.chatNotifications.filter((item) => item.id !== removed.id) } : current);
            return;
          }
          const incoming = payload.new as Notification;
          if (!incoming?.id || incoming.type !== 'new_message') return;
          setState((current) => current ? {
            ...current,
            chatNotifications: current.chatNotifications.some((item) => item.id === incoming.id)
              ? current.chatNotifications.map((item) => item.id === incoming.id ? incoming : item)
              : [incoming, ...current.chatNotifications].slice(0, 4),
          } : current);
          if (payload.eventType === 'INSERT') {
            setFreshNotificationId(incoming.id);
            window.setTimeout(() => setFreshNotificationId((current) => current === incoming.id ? null : current), 480);
          }
        })
        .subscribe();
    })();

    return () => {
      active = false;
      if (notificationChannel) void supabase.removeChannel(notificationChannel);
    };
  }, []);

  const today = localDateKey(now);
  const todayTodos = useMemo(() => state?.todos.filter((todo) => todo.due_on === today) ?? [], [state, today]);
  const futureTodos = useMemo(() => state?.todos.filter((todo) => todo.due_on > today) ?? [], [state, today]);
  const tasksLeft = todayTodos.filter((todo) => !todo.completed).length;
  const completedToday = todayTodos.filter((todo) => todo.completed).length;
  const unreadChats = state?.chatNotifications.filter((notification) => !notification.read_at).length ?? 0;

  async function addTodayTask(event: FormEvent) {
    event.preventDefault();
    setTaskBusy('new');
    setTaskMessage(null);
    const result = await createTodo(taskDraft, localDateKey());
    setTaskBusy(null);
    if (!result.ok) {
      setTaskMessage(result.error);
      return;
    }
    setState((current) => current ? { ...current, todos: [...current.todos, result.data] } : current);
    setTaskDraft('');
    setFreshTaskId(result.data.id);
    window.setTimeout(() => setFreshTaskId((current) => current === result.data.id ? null : current), 360);
  }

  async function toggleTodayTask(todo: Todo) {
    setTaskBusy(todo.id);
    setTaskMessage(null);
    const nextCompleted = !todo.completed;
    const result = await setTodoCompleted(todo.id, nextCompleted);
    setTaskBusy(null);
    if (!result.ok) {
      setTaskMessage(result.error);
      return;
    }
    setState((current) => current ? { ...current, todos: current.todos.map((item) => item.id === todo.id ? result.data : item) } : current);
    if (nextCompleted) {
      setCompletedPulseId(todo.id);
      window.setTimeout(() => setCompletedPulseId((current) => current === todo.id ? null : current), 340);
    }
  }

  function openNotification(notification: Notification) {
    if (!notification.read_at) {
      const readAt = new Date().toISOString();
      setState((current) => current ? { ...current, chatNotifications: current.chatNotifications.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item) } : current);
      void markNotificationRead(notification.id);
    }
  }

  function loadWeather() {
    if (!navigator.geolocation) {
      setWeatherMessage('Location is not available in this browser.');
      return;
    }
    setWeatherBusy(true);
    setWeatherMessage(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const useFahrenheit = navigator.language.toLowerCase().includes('us');
          const params = new URLSearchParams({
            latitude: String(position.coords.latitude),
            longitude: String(position.coords.longitude),
            current: 'temperature_2m,apparent_temperature,weather_code',
            daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
            timezone: 'auto',
            forecast_days: '1',
            temperature_unit: useFahrenheit ? 'fahrenheit' : 'celsius',
          });
          const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
          if (!response.ok) throw new Error('Weather request failed');
          const data = await response.json();
          const next: WeatherSnapshot = {
            temperature: Number(data.current?.temperature_2m ?? 0),
            apparent: Number(data.current?.apparent_temperature ?? 0),
            weatherCode: Number(data.current?.weather_code ?? 0),
            high: Number(data.daily?.temperature_2m_max?.[0] ?? 0),
            low: Number(data.daily?.temperature_2m_min?.[0] ?? 0),
            precip: Number(data.daily?.precipitation_probability_max?.[0] ?? 0),
            sunrise: String(data.daily?.sunrise?.[0] ?? ''),
            sunset: String(data.daily?.sunset?.[0] ?? ''),
            unit: String(data.current_units?.temperature_2m ?? (useFahrenheit ? '°F' : '°C')),
            fetchedAt: new Date().toISOString(),
          };
          setWeather(next);
          try { window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(next)); } catch {}
        } catch {
          setWeatherMessage('Weather could not load right now.');
        } finally {
          setWeatherBusy(false);
        }
      },
      () => {
        setWeatherBusy(false);
        setWeatherMessage('Allow location to show local weather.');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60_000 },
    );
  }

  function updateQuickNote(value: string) {
    setQuickNote(value);
    setQuickNoteStatus(null);
    try { window.localStorage.setItem(QUICK_NOTE_KEY, value); } catch {}
  }

  async function saveQuickNote() {
    if (!state || !quickNote.trim()) return;
    setQuickNoteStatus('Saving…');
    const supabase = createClient();
    const { error } = await supabase.from('notes').insert({
      user_id: state.userId,
      title: 'Quick Note',
      content: [{ id: crypto.randomUUID(), type: 'paragraph', text: quickNote.trim() }],
      is_pinned: false,
    });
    if (error) {
      setQuickNoteStatus('Could not save yet.');
      return;
    }
    updateQuickNote('');
    setQuickNoteStatus('Saved to Notes');
  }

  function submitRavin(event: FormEvent) {
    event.preventDefault();
    if (!ravinPrompt.trim()) return;
    setRavinMessage('RAVIN is not connected yet — this is the 1.1 prompt preview.');
  }

  function beginCustomize() {
    const currentWidgets = cloneWidgets(widgets);
    const currentLayout = readLayout();
    setEditBaseline(currentWidgets);
    setLayoutBaseline(currentLayout);
    setLayoutDraft(currentLayout);
    setEditingDashboard(true);
  }

  function previewLayout(next: RelayLayout) {
    setLayoutDraft(next);
    document.documentElement.dataset.relayLayout = next;
  }

  function saveAndExit() {
    saveDashboardLayout(widgets);
    saveLayout(layoutDraft);
    setEditBaseline(null);
    setLayoutBaseline(null);
    setEditingDashboard(false);
  }

  function cancelCustomize() {
    if (editBaseline) setWidgets(cloneWidgets(editBaseline));
    if (layoutBaseline) {
      document.documentElement.dataset.relayLayout = layoutBaseline;
      setLayoutDraft(layoutBaseline);
    }
    setDraggingWidget(null);
    setEditBaseline(null);
    setLayoutBaseline(null);
    setEditingDashboard(false);
  }

  function updateWidgets(next: DashboardWidgetPreference[]) {
    setWidgets(normalizeDashboardLayout(next));
  }

  function moveWidget(id: DashboardWidgetId, direction: -1 | 1) {
    const index = widgets.findIndex((widget) => widget.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= widgets.length) return;
    const next = cloneWidgets(widgets);
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(nextIndex, 0, moved);
    updateWidgets(next);
  }

  function toggleWidget(id: DashboardWidgetId) {
    updateWidgets(widgets.map((widget) => widget.id === id ? { ...widget, visible: !widget.visible } : widget));
  }

  function setWidgetSize(id: DashboardWidgetId, size: DashboardWidgetSize) {
    updateWidgets(widgets.map((widget) => widget.id === id ? { ...widget, size } : widget));
  }

  function dropWidget(targetId: DashboardWidgetId) {
    if (!draggingWidget || draggingWidget === targetId) return setDraggingWidget(null);
    const from = widgets.findIndex((widget) => widget.id === draggingWidget);
    const to = widgets.findIndex((widget) => widget.id === targetId);
    if (from < 0 || to < 0) return setDraggingWidget(null);
    const next = cloneWidgets(widgets);
    const [moved] = next.splice(from, 1);
    if (!moved) return setDraggingWidget(null);
    next.splice(to, 0, moved);
    setDraggingWidget(null);
    updateWidgets(next);
  }

  if (!state) return <PageLoading />;

  const activeWidgets = isDesktop ? widgets : DEFAULT_DASHBOARD_LAYOUT;

  function renderWidget(widget: DashboardWidgetPreference, index: number) {
    if (widget.id === 'overview') {
      return (
        <section aria-label="Daily overview" className="relay-motion-dashboard-strip grid h-full min-h-[92px] grid-cols-3 overflow-hidden rounded-lg border border-border bg-surface-raised">
          <OverviewStat value={tasksLeft} label="tasks left" delay={110} />
          <OverviewStat value={state.events.length} label="upcoming" delay={165} />
          <OverviewStat value={unreadChats} label="new chats" delay={220} />
        </section>
      );
    }

    if (widget.id === 'weather') {
      return (
        <DashboardCard index={index} icon={<CloudSun size={18} />} title="Weather">
          {!weather ? (
            <div className="rounded-xl bg-surface p-4">
              <p className="text-sm text-ink-muted">Use your device location to show local weather here.</p>
              <button type="button" onClick={loadWeather} disabled={weatherBusy} className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-ink px-3 text-xs font-semibold text-canvas disabled:opacity-50">{weatherBusy ? 'Loading…' : 'Use my location'}</button>
              {weatherMessage && <p className="mt-2 text-xs text-ink-faint">{weatherMessage}</p>}
            </div>
          ) : (
            <div>
              <div className="flex items-end justify-between gap-4">
                <div><p className="font-display text-4xl font-medium tabular-nums text-ink">{Math.round(weather.temperature)}{weather.unit}</p><p className="mt-1 text-sm text-ink-muted">{weatherLabel(weather.weatherCode)}</p></div>
                <div className="text-right text-xs text-ink-faint"><p>Feels {Math.round(weather.apparent)}{weather.unit}</p><p className="mt-1">H {Math.round(weather.high)}° · L {Math.round(weather.low)}°</p></div>
              </div>
              {widget.size !== 'small' && <div className="mt-4 grid grid-cols-2 gap-2"><WeatherStat label="Rain chance" value={`${Math.round(weather.precip)}%`} /><WeatherStat label="Updated" value={formatRelative(weather.fetchedAt)} /></div>}
              <button type="button" onClick={loadWeather} disabled={weatherBusy} className="mt-3 text-xs font-medium text-ink-muted hover:text-ink">{weatherBusy ? 'Refreshing…' : 'Refresh weather'}</button>
            </div>
          )}
        </DashboardCard>
      );
    }

    if (widget.id === 'askravin') {
      return (
        <DashboardCard index={index} icon={<Sparkles size={18} />} title="Ask RAVIN" badge="Preview">
          <form onSubmit={submitRavin} className="rounded-2xl border border-border bg-canvas p-2">
            <div className="flex items-center gap-2">
              <input value={ravinPrompt} onChange={(event) => { setRavinPrompt(event.target.value); setRavinMessage(null); }} placeholder="Ask RAVIN anything…" aria-label="Ask RAVIN preview" className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint" />
              <button type="button" onClick={() => setRavinMessage('Voice is coming with the full RAVIN connection.')} aria-label="Preview RAVIN microphone orb" className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-surface text-ink shadow-sm">
                <span className="absolute inset-1 rounded-full border border-ink/10 animate-pulse" />
                <Mic size={17} className="relative" />
              </button>
              <button type="submit" disabled={!ravinPrompt.trim()} aria-label="Send preview prompt" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-ink text-canvas disabled:opacity-35"><Send size={16} /></button>
            </div>
          </form>
          <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs leading-5 text-ink-faint">RAVIN will eventually use Relay context like To‑Do, Calendar, Notes, and files.</p><span className="shrink-0 rounded-full border border-border px-2 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-ink-muted">1.1</span></div>
          {ravinMessage && <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-xs text-ink-muted">{ravinMessage}</p>}
        </DashboardCard>
      );
    }

    if (widget.id === 'tasks') {
      return (
        <DashboardCard index={index} icon={<ListTodo size={18} />} title="To-Do" href="/todo" linkLabel="Open week">
          {state.taskError ? <EmptyState>Tasks could not load.</EmptyState> : todayTodos.length === 0 ? <EmptyState>Nothing on your list yet.</EmptyState> : (
            <ul className="space-y-1">
              {todayTodos.slice(0, widget.size === 'small' ? 3 : 6).map((todo) => (
                <li key={todo.id} className={`flex items-center gap-3 rounded-md px-1 py-2 ${freshTaskId === todo.id ? 'relay-motion-live-row' : ''}`}>
                  <button type="button" disabled={taskBusy === todo.id} onClick={() => toggleTodayTask(todo)} aria-label={todo.completed ? `Mark ${todo.title} incomplete` : `Complete ${todo.title}`} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${todo.completed ? 'border-ink bg-ink text-canvas' : 'border-ink-faint text-transparent'} disabled:opacity-50`}><Check size={13} strokeWidth={3} className={completedPulseId === todo.id ? 'relay-motion-check' : ''} /></button>
                  <span className={`truncate text-sm ${todo.completed ? 'text-ink-faint line-through' : 'text-ink'}`}>{todo.title}</span>
                </li>
              ))}
            </ul>
          )}
          {widget.size !== 'small' && <form onSubmit={addTodayTask} className="mt-4 flex gap-2 border-t border-border pt-4"><input value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} maxLength={120} placeholder="Quick add for today…" className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted" /><button type="submit" disabled={taskBusy === 'new' || !taskDraft.trim()} aria-label="Add task" className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-ink text-canvas disabled:opacity-40"><Plus size={17} /></button></form>}
          {taskMessage && <p className="mt-2 text-sm text-red-600">{taskMessage}</p>}
        </DashboardCard>
      );
    }

    if (widget.id === 'calendar') {
      return (
        <DashboardCard index={index} icon={<CalendarDays size={18} />} title="Next Up" href="/calendar" linkLabel="Calendar">
          {state.events.length === 0 ? <EmptyState>{state.calendarConnected ? 'Nothing else is scheduled.' : 'Connect Calendar for your full schedule.'}</EmptyState> : <EventList events={state.events.slice(0, widget.size === 'small' ? 2 : 5)} compact={widget.size === 'small'} />}
        </DashboardCard>
      );
    }

    if (widget.id === 'today') {
      return (
        <DashboardCard index={index} icon={<Gauge size={18} />} title="Today" href="/calendar" linkLabel="Full day">
          <div className={`grid gap-3 ${widget.size === 'wide' ? 'sm:grid-cols-3' : ''}`}>
            <MiniPanel label="Tasks" value={tasksLeft ? `${tasksLeft} left` : 'All clear'} detail={todayTodos[0]?.title ?? 'No tasks due'} />
            <MiniPanel label="Next" value={state.events[0] ? formatEventTime(state.events[0].startsAt) : 'Open'} detail={state.events[0]?.title ?? 'No upcoming event'} />
            <MiniPanel label="Messages" value={unreadChats ? `${unreadChats} unread` : 'Caught up'} detail={state.chatNotifications[0]?.title ?? 'No new chats'} />
          </div>
        </DashboardCard>
      );
    }

    if (widget.id === 'email') {
      return (
        <DashboardCard index={index} icon={<Inbox size={18} />} title="Inbox" href="/email" linkLabel="Inbox">
          {!state.emailConnected ? <EmptyState>Connect Google or Microsoft email to bring your latest messages here.</EmptyState> : state.emails.length === 0 ? <EmptyState>Your inbox is clear.</EmptyState> : (
            <ul className="divide-y divide-border">{state.emails.slice(0, widget.size === 'small' ? 2 : 4).map((email) => <li key={email.id} className="flex items-start gap-3 py-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${email.isUnread ? 'bg-blue-500' : 'bg-border'}`} /><div className="min-w-0 flex-1"><p className={`truncate text-sm text-ink ${email.isUnread ? 'font-semibold' : ''}`}>{email.subject}</p>{widget.size !== 'small' && <p className="mt-1 truncate text-xs text-ink-faint">{cleanSender(email.from)}</p>}</div>{email.receivedAt && widget.size !== 'small' && <time className="shrink-0 text-xs text-ink-muted">{formatShortDate(email.receivedAt)}</time>}</li>)}</ul>
          )}
        </DashboardCard>
      );
    }

    if (widget.id === 'chats') {
      return (
        <DashboardCard index={index} icon={<MessageCircle size={18} />} title="Chats" href="/chats" linkLabel="Chats">
          {state.chatNotifications.length === 0 ? <EmptyState>No new chat notifications.</EmptyState> : <ul className="divide-y divide-border">{state.chatNotifications.slice(0, widget.size === 'small' ? 2 : 4).map((notification) => <li key={notification.id} className={freshNotificationId === notification.id ? 'relay-motion-live-row' : ''}><a href={appPageUrl(normalizeAppLink(notification.link ?? '/chats'))} onClick={() => openNotification(notification)} className="flex items-start gap-3 py-3 hover:opacity-70"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? 'bg-border' : 'bg-blue-500'}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{notification.title}</p>{widget.size !== 'small' && <p className="mt-1 truncate text-xs text-ink-faint">{notification.body}</p>}</div>{widget.size !== 'small' && <time className="shrink-0 text-xs text-ink-muted">{formatRelative(notification.created_at)}</time>}</a></li>)}</ul>}
        </DashboardCard>
      );
    }

    if (widget.id === 'quicknote') {
      return (
        <DashboardCard index={index} icon={<NotebookPen size={18} />} title="Quick Note" href="/notes" linkLabel="Notes">
          <textarea value={quickNote} onChange={(event) => updateQuickNote(event.target.value)} rows={widget.size === 'small' ? 3 : 5} placeholder="Capture something before it disappears…" className="w-full resize-none rounded-xl border border-border bg-canvas p-3 text-sm leading-6 text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted" />
          <div className="mt-2 flex items-center justify-between gap-3"><span className="text-xs text-ink-faint">{quickNoteStatus ?? 'Scratchpad auto-saves on this device.'}</span><button type="button" onClick={saveQuickNote} disabled={!quickNote.trim()} className="rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-canvas disabled:opacity-35">Save to Notes</button></div>
        </DashboardCard>
      );
    }

    if (widget.id === 'focus') {
      return (
        <DashboardCard index={index} icon={<TimerReset size={18} />} title="Focus">
          <div className="text-center"><p className="font-mono text-4xl font-semibold tabular-nums text-ink">{formatTimer(focusSeconds)}</p><p className="mt-1 text-xs text-ink-faint">{focusRunning ? 'Focus session running' : 'Pick a block and lock in'}</p></div>
          <div className="mt-4 flex justify-center gap-2"><button type="button" onClick={() => setFocusRunning((value) => !value)} disabled={focusSeconds === 0} className="grid h-10 w-10 place-items-center rounded-full bg-ink text-canvas disabled:opacity-35">{focusRunning ? <Pause size={16} /> : <Play size={16} />}</button><button type="button" onClick={() => { setFocusRunning(false); setFocusSeconds(25 * 60); }} className="grid h-10 w-10 place-items-center rounded-full border border-border text-ink-muted"><RotateCcw size={15} /></button></div>
          {widget.size !== 'small' && <div className="mt-4 grid grid-cols-3 gap-2">{[25,45,60].map((minutes) => <button key={minutes} type="button" onClick={() => { setFocusRunning(false); setFocusSeconds(minutes * 60); }} className="rounded-lg border border-border bg-canvas px-2 py-2 text-xs font-medium text-ink-muted hover:text-ink">{minutes}m</button>)}</div>}
        </DashboardCard>
      );
    }

    if (widget.id === 'dayprogress') {
      const progress = dayProgress(now);
      return <DashboardCard index={index} icon={<Gauge size={18} />} title="Day Progress"><div className="flex items-end justify-between"><p className="font-display text-4xl font-medium text-ink">{progress}%</p><p className="text-xs text-ink-faint">7 AM → 11 PM</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${progress}%` }} /></div></DashboardCard>;
    }

    if (widget.id === 'assignments') {
      return <DashboardCard index={index} icon={<BookOpen size={18} />} title="Assignments" href="/todo" linkLabel="To-Do">{futureTodos.length === 0 ? <EmptyState>No upcoming dated tasks.</EmptyState> : <ul className="divide-y divide-border">{futureTodos.slice(0, widget.size === 'small' ? 2 : 6).map((todo) => <li key={todo.id} className="flex items-center justify-between gap-3 py-3"><p className="truncate text-sm text-ink">{todo.title}</p><time className="shrink-0 text-xs text-ink-faint">{formatShortDate(`${todo.due_on}T12:00:00`)}</time></li>)}</ul>}</DashboardCard>;
    }

    if (widget.id === 'momentum') {
      const total = todayTodos.length;
      const percent = total ? Math.round((completedToday / total) * 100) : 0;
      return <DashboardCard index={index} icon={<Zap size={18} />} title="Momentum"><p className="font-display text-4xl font-medium text-ink">{percent}%</p><p className="mt-1 text-xs text-ink-faint">{completedToday} of {total} tasks complete today</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} /></div></DashboardCard>;
    }

    if (widget.id === 'sun') {
      return <DashboardCard index={index} icon={<Sun size={18} />} title="Sunrise / Sunset">{!weather ? <EmptyState>Enable Weather first to show local sun times.</EmptyState> : <div className="grid grid-cols-2 gap-3"><MiniPanel label="Sunrise" value={formatClock(weather.sunrise)} detail="Morning" /><MiniPanel label="Sunset" value={formatClock(weather.sunset)} detail="Evening" /></div>}</DashboardCard>;
    }

    if (widget.id === 'countdowns') {
      const event = state.events[0];
      return <DashboardCard index={index} icon={<FileClock size={18} />} title="Countdowns" href="/calendar" linkLabel="Calendar">{!event ? <EmptyState>Add an event to start a countdown.</EmptyState> : <div className="rounded-xl bg-surface p-4"><p className="text-xs uppercase tracking-[.14em] text-ink-faint">Next up</p><p className="mt-2 truncate text-sm font-semibold text-ink">{event.title}</p><p className="mt-1 font-display text-2xl font-medium text-ink">{formatCountdown(event.startsAt)}</p></div>}</DashboardCard>;
    }

    if (widget.id === 'schoolschedule') {
      return <DashboardCard index={index} icon={<School size={18} />} title="School Schedule" href="/calendar" linkLabel="Calendar">{state.events.length === 0 ? <EmptyState>Add your class schedule to Calendar and it will surface here.</EmptyState> : <EventList events={state.events.slice(0, widget.size === 'small' ? 2 : 4)} compact={widget.size === 'small'} />}</DashboardCard>;
    }

    if (widget.id === 'ravinbrief') {
      return <DashboardCard index={index} icon={<WandSparkles size={18} />} title="RAVIN Brief" badge="Preview"><div className={`grid gap-3 ${widget.size === 'wide' ? 'sm:grid-cols-3' : ''}`}><MiniPanel label="Priority" value={tasksLeft ? `${tasksLeft} tasks` : 'Clear'} detail={todayTodos.find((todo) => !todo.completed)?.title ?? 'Nothing urgent'} /><MiniPanel label="Schedule" value={state.events[0] ? formatEventTime(state.events[0].startsAt) : 'Open'} detail={state.events[0]?.title ?? 'No next event'} /><MiniPanel label="Inbox" value={unreadChats ? `${unreadChats} chats` : 'Quiet'} detail="Full AI briefing arrives with RAVIN" /></div><p className="mt-3 text-xs text-ink-faint">This preview uses simple Relay counts. RAVIN 1.1 will generate the actual brief.</p></DashboardCard>;
    }

    if (widget.id === 'nowplaying') {
      return <PlaceholderCard index={index} icon={<Music2 size={18} />} title="Now Playing" text="Music controls will appear here when Relay’s music connector is enabled." action="Music integration" />;
    }

    if (widget.id === 'pinnedpeople') {
      return <PlaceholderCard index={index} icon={<Users size={18} />} title="Pinned People" text="Pin favorite contacts for one-click chats and presence." action="Open Contacts" href="/contacts" />;
    }

    if (widget.id === 'recentfiles') {
      return <PlaceholderCard index={index} icon={<FileClock size={18} />} title="Recent Files" text="Recent Relay and connected files will live here once file connectors are enabled." action="Open Notes" href="/notes" />;
    }

    return (
      <section className={`grid h-full gap-3 ${widget.size === 'wide' ? 'sm:grid-cols-4' : 'grid-cols-1'}`}>
        <QuickLink index={0} href="/todo" icon={<ListTodo size={17} />} label="New task" />
        <QuickLink index={1} href="/planner" icon={<CalendarDays size={17} />} label="New plan" />
        <QuickLink index={2} href="/chats" icon={<MessageCircle size={17} />} label="New chat" />
        <QuickLink index={3} href="/notes" icon={<NotebookPen size={17} />} label="New note" />
      </section>
    );
  }

  const dashboardGrid = (
    <>
      <div className={`relay-dashboard-grid grid grid-cols-1 gap-5 md:grid-cols-12 ${editingDashboard && isDesktop ? 'mt-0' : 'mt-7'}`}>
        {activeWidgets.filter((widget) => widget.visible).map((widget, index) => (
          <div key={widget.id} className="relay-dashboard-widget min-w-0 transition-[opacity,transform] duration-150" style={isDesktop ? { gridColumn: `span ${dashboardSpan(widget.size)} / span ${dashboardSpan(widget.size)}` } : undefined} draggable={Boolean(editingDashboard && isDesktop)} data-dragging={draggingWidget === widget.id ? 'true' : 'false'} onDragStart={() => setDraggingWidget(widget.id)} onDragEnd={() => setDraggingWidget(null)} onDragOver={(event) => { if (editingDashboard && isDesktop) event.preventDefault(); }} onDrop={(event) => { event.preventDefault(); dropWidget(widget.id); }}>
            {renderWidget(widget, index)}
          </div>
        ))}
      </div>
      {isDesktop && activeWidgets.every((widget) => !widget.visible) && <button type="button" onClick={editingDashboard ? undefined : beginCustomize} className="mt-7 w-full rounded-2xl border border-dashed border-border bg-surface px-5 py-12 text-center text-sm text-ink-muted hover:bg-surface-raised">Your dashboard is empty. {editingDashboard ? 'Use the widget library below.' : 'Customize it to add widgets.'}</button>}
    </>
  );

  return (
    <div className={`relay-dashboard mx-auto max-w-6xl px-4 py-7 md:px-6 md:py-9 ${editingDashboard ? 'relay-dashboard-editing' : ''}`}>
      <header className="relay-motion-hero-in flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-ink-muted">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1 className="mt-1 font-display text-3xl font-medium tracking-tight text-ink">{state.firstName ? `Hey, ${state.firstName}.` : 'Hey.'}</h1></div>
        <div className="flex items-end gap-4 sm:text-right"><div><p className="font-display text-3xl font-medium tabular-nums tracking-tight text-ink">{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-faint">Your day at a glance</p></div>{!editingDashboard && <button type="button" onClick={beginCustomize} className="hidden min-h-10 items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 text-sm font-medium text-ink transition hover:bg-surface md:inline-flex"><LayoutDashboard size={15} />Customize</button>}</div>
      </header>

      {editingDashboard && isDesktop ? (
        <>
          <div className="relay-dashboard-preview-sticky mt-6"><div className="relay-dashboard-preview-surface"><div className="mb-3 flex items-center justify-between gap-3"><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-ink-faint">Live preview</span><span className="text-[11px] text-ink-faint">Drag cards to reorder</span></div>{dashboardGrid}</div></div>
          <section className="relay-dashboard-customizer mt-8 rounded-2xl border border-border bg-surface-raised p-4 md:p-5">
            <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-ink"><LayoutDashboard size={17} /><h2 className="text-sm font-semibold">Widget Library</h2></div><p className="mt-1 text-xs leading-5 text-ink-faint">Show, hide, resize, and reorder your dashboard. Connector-based widgets can be added now and will light up as their integrations arrive.</p></div><button type="button" onClick={() => setWidgets(cloneWidgets(DEFAULT_DASHBOARD_LAYOUT))} className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-canvas px-3 text-xs font-medium text-ink hover:bg-surface"><RotateCcw size={13} />Reset widgets</button></div>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.72fr)]">
              <div className="space-y-2">{widgets.map((widget, index) => <div key={widget.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-canvas p-2.5"><GripVertical size={15} className="text-ink-faint" /><div className="min-w-40 flex-1"><div className="text-sm font-medium text-ink">{WIDGET_META[widget.id].label}</div><div className="mt-0.5 text-[11px] text-ink-faint">{WIDGET_META[widget.id].description}</div></div><div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">{(['small','medium','wide'] as DashboardWidgetSize[]).map((size) => <button key={size} type="button" disabled={!widget.visible} onClick={() => setWidgetSize(widget.id, size)} className={`rounded-md px-2 py-1 text-[10px] font-medium ${widget.size === size && widget.visible ? 'bg-ink text-canvas' : 'text-ink-muted hover:bg-surface-raised'} disabled:opacity-35`}>{SIZE_LABELS[size]}</button>)}</div><button type="button" onClick={() => moveWidget(widget.id, -1)} disabled={index === 0} aria-label={`Move ${WIDGET_META[widget.id].label} up`} className="grid h-8 w-8 place-items-center rounded-md border border-border text-ink-muted hover:bg-surface disabled:opacity-30"><ArrowUp size={13} /></button><button type="button" onClick={() => moveWidget(widget.id, 1)} disabled={index === widgets.length - 1} aria-label={`Move ${WIDGET_META[widget.id].label} down`} className="grid h-8 w-8 place-items-center rounded-md border border-border text-ink-muted hover:bg-surface disabled:opacity-30"><ArrowDown size={13} /></button><button type="button" onClick={() => toggleWidget(widget.id)} className={`min-h-8 rounded-md border px-2.5 text-[10px] font-semibold uppercase tracking-wide ${widget.visible ? 'border-ink bg-ink text-canvas' : 'border-border text-ink-muted'}`}>{widget.visible ? 'Shown' : 'Hidden'}</button></div>)}</div>
              <LayoutControls value={layoutDraft} onChange={previewLayout} />
            </div>
          </section>
          <div className="relay-dashboard-editor-actions" role="group" aria-label="Dashboard customization actions"><button type="button" onClick={cancelCustomize} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-ink-muted hover:text-ink"><X size={15} />Cancel</button><button type="button" onClick={saveAndExit} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-ink px-4 text-sm font-medium text-canvas"><Check size={15} />Save & Exit</button></div>
        </>
      ) : dashboardGrid}
    </div>
  );
}

function DashboardCard({ icon, title, href, linkLabel, badge, children, index }: { icon: ReactNode; title: string; href?: string; linkLabel?: string; badge?: string; children: ReactNode; index: number }) {
  return <section className="relay-motion-dashboard-card h-full rounded-lg border border-border bg-surface-raised p-4 sm:p-5" style={{ animationDelay: `${150 + index * 70}ms` }}><header className="mb-3 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2 text-ink"><span className="shrink-0 text-ink-muted">{icon}</span><h2 className="truncate font-medium">{title}</h2>{badge && <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[.12em] text-ink-faint">{badge}</span>}</div>{href && linkLabel && <a href={appPageUrl(href)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink">{linkLabel}<ArrowRight size={13} /></a>}</header>{children}</section>;
}

function PlaceholderCard({ icon, title, text, action, href, index }: { icon: ReactNode; title: string; text: string; action: string; href?: string; index: number }) {
  return <DashboardCard index={index} icon={icon} title={title} badge="Soon"><div className="rounded-xl border border-dashed border-border bg-surface p-4"><p className="text-sm leading-6 text-ink-muted">{text}</p>{href ? <a href={appPageUrl(href)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink">{action}<ArrowRight size={13} /></a> : <p className="mt-3 text-[10px] font-semibold uppercase tracking-[.14em] text-ink-faint">{action}</p>}</div></DashboardCard>;
}

function EventList({ events, compact }: { events: DashboardEvent[]; compact: boolean }) {
  return <ul className="divide-y divide-border">{events.map((event) => { const content = <><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{event.title}</p>{!compact && <p className="mt-1 truncate text-xs text-ink-faint">{event.source}</p>}</div><time className="shrink-0 text-xs text-ink-muted">{formatEventTime(event.startsAt)}</time></>; return <li key={event.id}>{event.href ? <a href={event.external ? event.href : appPageUrl(event.href)} target={event.external ? '_blank' : undefined} rel={event.external ? 'noreferrer' : undefined} className="flex items-start justify-between gap-3 py-3 hover:opacity-70">{content}</a> : <div className="flex items-start justify-between gap-3 py-3">{content}</div>}</li>; })}</ul>;
}

function OverviewStat({ value, label, delay }: { value: number; label: string; delay: number }) {
  return <div className="border-r border-border px-3 py-4 text-center last:border-r-0"><p key={value} className="relay-motion-stat font-display text-2xl font-medium tabular-nums text-ink" style={{ animationDelay: `${delay}ms` }}>{value}</p><p className="mt-1 text-xs text-ink-faint">{label}</p></div>;
}

function MiniPanel({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-border bg-surface p-3"><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-ink-faint">{label}</p><p className="mt-2 truncate text-lg font-medium text-ink">{value}</p><p className="mt-1 truncate text-xs text-ink-muted">{detail}</p></div>;
}

function WeatherStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-surface px-3 py-2"><p className="text-[10px] uppercase tracking-[.12em] text-ink-faint">{label}</p><p className="mt-1 text-sm font-medium text-ink">{value}</p></div>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-surface px-3 py-5 text-sm leading-5 text-ink-faint">{children}</p>;
}

function QuickLink({ href, icon, label, index }: { href: string; icon: ReactNode; label: string; index: number }) {
  return <a href={appPageUrl(href)} style={{ animationDelay: `${470 + index * 70}ms` }} className="relay-motion-dashboard-card relay-motion-quick-cta flex min-h-14 items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"><span className="flex items-center gap-2"><span className="text-ink-muted">{icon}</span>{label}</span><ArrowRight size={15} className="text-ink-faint" /></a>;
}

function cleanSender(sender: string) {
  return sender.replace(/<.*>/, '').trim() || sender;
}

function formatEventTime(raw: string) {
  const date = new Date(raw);
  if (localDateKey(date) === localDateKey()) return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatShortDate(raw: string) {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatRelative(raw: string) {
  const date = new Date(raw);
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatTimer(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function dayProgress(now: Date) {
  const start = new Date(now); start.setHours(7, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 0, 0, 0);
  const ratio = (now.getTime() - start.getTime()) / (end.getTime() - start.getTime());
  return Math.max(0, Math.min(100, Math.round(ratio * 100)));
}

function formatClock(raw: string) {
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatCountdown(raw: string) {
  const diff = new Date(raw).getTime() - Date.now();
  if (diff <= 0) return 'Starting now';
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function weatherLabel(code: number) {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code === 45 || code === 48) return 'Foggy';
  if (code >= 51 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95) return 'Thunderstorms';
  return 'Mixed conditions';
}
