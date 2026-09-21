'use client';

import { DashboardStudio } from '@/components/dashboard/dashboard-studio';
import { PageLoading } from '@/components/page-loading';
import { createTodo, setTodoCompleted } from '@/lib/actions/todos';
import { markNotificationRead } from '@/lib/actions/notifications';
import { appPageUrl, normalizeAppLink } from '@/lib/config';
import { localDateKey } from '@/lib/date';
import {
  DASHBOARD_LAYOUT_EVENT,
  DASHBOARD_LAYOUT_KEY,
  DEFAULT_DASHBOARD_LAYOUT,
  normalizeDashboardLayout,
  readDashboardLayout,
  saveDashboardLayout,
  type DashboardWidgetId,
  type DashboardWidgetPreference,
} from '@/lib/dashboard-layout';
import { readLayout, saveLayout, type RelayLayout } from '@/lib/layout-mode';
import { createClient } from '@/lib/supabase/client';
import type { NoteBlock, Notification, Todo } from '@/lib/types/database';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  CloudSun,
  FileClock,
  Gauge,
  LayoutDashboard,
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
  Zap,
} from 'lucide-react';
import { Dispatch, FormEvent, ReactNode, SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';

type DashboardEvent = {
  id: string;
  title: string;
  startsAt: string;
  source: string;
  href: string | null;
  external?: boolean;
  isAllDay?: boolean;
};

type DashboardState = {
  userId: string;
  firstName: string | null;
  todos: Todo[];
  events: DashboardEvent[];
  chatNotifications: Notification[];
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
  zipCode: string;
  locationLabel: string;
};

const WEATHER_CACHE_KEY = 'relay-dashboard-weather-v2';
const WEATHER_ZIP_KEY = 'relay-dashboard-weather-zip-v1';
const QUICK_NOTE_KEY = 'relay-dashboard-quick-note-v1';

export const WIDGET_META: Record<DashboardWidgetId, { label: string; description: string }> = {
  overview: { label: 'Daily overview', description: 'Tasks, upcoming items, and unread chats.' },
  weather: { label: 'Weather', description: 'Local conditions, high/low, rain chance, and sun times.' },
  tasks: { label: 'To-Do', description: 'Today’s checklist with quick add.' },
  calendar: { label: 'Next Up', description: 'Your next plans and calendar events.' },
  today: { label: 'Today', description: 'A compact timeline of what matters today.' },
  chats: { label: 'Chats', description: 'Newest Relay conversations and unread messages.' },
  quicknote: { label: 'Quick Note', description: 'Capture a thought and send it into Relay Notes.' },
  focus: { label: 'Focus', description: 'A simple focus timer with quick presets.' },
  nowplaying: { label: 'Now Playing', description: 'Reserved for a future music connection.' },
  pinnedpeople: { label: 'Pinned People', description: 'Reserved for future favorite-contact controls.' },
  quicklinks: { label: 'Quick Actions', description: 'Jump straight into To-Do, Planner, Chats, or Notes.' },
  dayprogress: { label: 'Day Progress', description: 'A glanceable progress meter for your day.' },
  schoolschedule: { label: 'School Schedule', description: 'Classes and school events pulled from Calendar.' },
  assignments: { label: 'Assignments', description: 'Upcoming incomplete dated To-Do items.' },
  momentum: { label: 'Momentum', description: 'Today’s completed-vs-total task progress.' },
  sun: { label: 'Sunrise / Sunset', description: 'Today’s sunrise and sunset from local weather.' },
  countdowns: { label: 'Countdowns', description: 'Time until your next timed event.' },
  recentfiles: { label: 'Recent Files', description: 'Reserved for a future connected-files source.' },
  ravinbrief: { label: 'RAVIN Brief', description: 'A preview of your future AI daily briefing.' },
  askravin: { label: 'Ask RAVIN', description: 'A teaser prompt box with the RAVIN voice orb.' },
};

function cloneWidgets(items: DashboardWidgetPreference[]) {
  return items.map((item) => ({ ...item }));
}

function readCachedWeather(): WeatherSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherSnapshot;
    if (typeof parsed.temperature !== 'number' || !/^\d{5}$/.test(parsed.zipCode ?? '')) return null;
    const fetchedAt = new Date(parsed.fetchedAt);
    if (Number.isNaN(fetchedAt.getTime()) || localDateKey(fetchedAt) !== localDateKey()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readWeatherZip() {
  if (typeof window === 'undefined') return '';
  try { return (window.localStorage.getItem(WEATHER_ZIP_KEY) ?? '').replace(/\D/g, '').slice(0, 5); } catch { return ''; }
}

function readQuickNote() {
  if (typeof window === 'undefined') return '';
  try { return window.localStorage.getItem(QUICK_NOTE_KEY) ?? ''; } catch { return ''; }
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    let notificationChannel: RealtimeChannel | null = null;

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const today = localDateKey();

      const [profileResult, todoResult, notificationResult, membershipResult, calendarAccounts, calendarStatus] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('id', user.id).single(),
        supabase.from('todos').select('*').eq('user_id', user.id).gte('due_on', today).order('due_on').order('completed').order('position').limit(40),
        supabase.from('notifications').select('*').eq('user_id', user.id).eq('type', 'new_message').order('created_at', { ascending: false }).limit(4),
        supabase.from('group_members').select('group_id').eq('user_id', user.id),
        supabase.functions.invoke('calendar-hub', { body: { action: 'accounts' } }),
        supabase.functions.invoke('calendar-hub', { body: { action: 'calendar_events' } }),
      ]);

      const groupIds = (membershipResult.data ?? []).map((membership) => membership.group_id);
      const accountCount = calendarAccounts.data?.accounts?.length ?? 0;
      const calendarAccountErrors = calendarStatus.data?.accountErrors?.length ?? 0;
      const calendarConnected = !calendarAccounts.error && accountCount > 0 && !calendarStatus.error && calendarAccountErrors < accountCount;

      const [planResult, calendarResult] = await Promise.all([
        groupIds.length
          ? supabase.from('plans').select('id,name,start_time,end_time,group:groups(name),instances:plan_instances(id,occurs_on)').in('group_id', groupIds)
          : Promise.resolve({ data: [], error: null }),
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
            startsAt: plan.start_time ? `${instance.occurs_on}T${plan.start_time}` : `${instance.occurs_on}T12:00:00`,
            source: plan.group?.name ?? 'Relay plan',
            href: `/planner/view/?id=${encodeURIComponent(plan.id)}`,
            isAllDay: !plan.start_time,
          })),
      );

      const calendarEvents: DashboardEvent[] = (calendarResult.data?.events ?? []).map((event: any) => ({
        id: `calendar-${event.id}`,
        title: event.summary,
        startsAt: event.isAllDay ? `${event.start}T12:00:00` : event.start,
        source: event.calendarName ? `${event.calendarName} · ${event.accountEmail}` : event.accountEmail ?? `${event.provider === 'microsoft' ? 'Microsoft' : 'Google'} Calendar`,
        href: event.htmlLink || null,
        external: true,
        isAllDay: Boolean(event.isAllDay),
      }));

      if (!active) return;
      setState({
        userId: user.id,
        firstName: profileResult.data?.display_name?.split(' ')[0] ?? null,
        todos: todoResult.data ?? [],
        events: [...relayEvents, ...calendarEvents]
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
          .slice(0, 12),
        chatNotifications: notificationResult.data ?? [],
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
        })
        .subscribe();
    })();

    return () => {
      active = false;
      if (notificationChannel) void supabase.removeChannel(notificationChannel);
    };
  }, []);

  if (!state) return <PageLoading />;
  return <LoadedDashboard state={state} setState={setState} />;
}

function LoadedDashboard({ state, setState }: { state: DashboardState; setState: Dispatch<SetStateAction<DashboardState | null>> }) {
  const [now, setNow] = useState(() => new Date());
  const [isDesktop, setIsDesktop] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidgetPreference[]>(() => cloneWidgets(DEFAULT_DASHBOARD_LAYOUT));
  const [editBaseline, setEditBaseline] = useState<DashboardWidgetPreference[] | null>(null);
  const [layoutDraft, setLayoutDraft] = useState<RelayLayout>('classic');
  const [layoutBaseline, setLayoutBaseline] = useState<RelayLayout | null>(null);
  const [selectedWidgetId, setSelectedWidgetId] = useState<DashboardWidgetId | null>(null);

  const [taskDraft, setTaskDraft] = useState('');
  const [taskBusy, setTaskBusy] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(() => readCachedWeather());
  const [weatherBusy, setWeatherBusy] = useState(false);
  const [weatherMessage, setWeatherMessage] = useState<string | null>(null);
  const [weatherZip, setWeatherZip] = useState(() => readWeatherZip());
  const [weatherZipDraft, setWeatherZipDraft] = useState(() => readWeatherZip());
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
    const timer = window.setTimeout(() => {
      const next = Math.max(0, focusSeconds - 1);
      setFocusSeconds(next);
      if (next === 0) setFocusRunning(false);
    }, 1_000);
    return () => window.clearTimeout(timer);
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

  const updateWidgets = useCallback((next: DashboardWidgetPreference[]) => {
    setWidgets(normalizeDashboardLayout(next));
  }, []);

  const today = localDateKey(now);
  const todayTodos = useMemo(() => state.todos.filter((todo) => todo.due_on === today), [state.todos, today]);
  const futureTodos = useMemo(() => state.todos.filter((todo) => todo.due_on > today && !todo.completed), [state.todos, today]);
  const upcomingEvents = useMemo(() => {
    const nowMs = now.getTime();
    return state.events.filter((event) => {
      const eventDate = new Date(event.startsAt);
      if (Number.isNaN(eventDate.getTime())) return false;
      if (event.isAllDay) return localDateKey(eventDate) >= today;
      return eventDate.getTime() >= nowMs;
    });
  }, [now, state.events, today]);
  const nextCountdownEvent = useMemo(
    () => upcomingEvents.find((event) => !event.isAllDay) ?? upcomingEvents[0] ?? null,
    [upcomingEvents],
  );
  const tasksLeft = todayTodos.filter((todo) => !todo.completed).length;
  const completedToday = todayTodos.filter((todo) => todo.completed).length;
  const unreadChats = state.chatNotifications.filter((notification) => !notification.read_at).length;

  async function addTodayTask(event: FormEvent) {
    event.preventDefault();
    setTaskBusy('new');
    setTaskMessage(null);
    const result = await createTodo(taskDraft, localDateKey());
    setTaskBusy(null);
    if (!result.ok) return setTaskMessage(result.error);
    setState((current) => current ? { ...current, todos: [...current.todos, result.data] } : current);
    setTaskDraft('');
  }

  async function toggleTodayTask(todo: Todo) {
    setTaskBusy(todo.id);
    const result = await setTodoCompleted(todo.id, !todo.completed);
    setTaskBusy(null);
    if (!result.ok) return setTaskMessage(result.error);
    setState((current) => current ? { ...current, todos: current.todos.map((item) => item.id === todo.id ? result.data : item) } : current);
  }

  function openNotification(notification: Notification) {
    if (notification.read_at) return;
    const readAt = new Date().toISOString();
    setState((current) => current ? { ...current, chatNotifications: current.chatNotifications.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item) } : current);
    void markNotificationRead(notification.id);
  }

  const loadWeather = useCallback(async (zipOverride?: string) => {
  const zip = String(zipOverride ?? weatherZip).replace(/\D/g, '').slice(0, 5);
  if (!/^\d{5}$/.test(zip)) {
    setWeatherMessage('Enter a 5-digit ZIP code.');
    return;
  }

  setWeatherBusy(true);
  setWeatherMessage(null);
  try {
    const zipResponse = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(zip)}`);
    if (zipResponse.status === 404) throw new Error('ZIP_NOT_FOUND');
    if (!zipResponse.ok) throw new Error('ZIP_LOOKUP_FAILED');
    const zipData = await zipResponse.json() as { places?: Array<{ latitude?: string; longitude?: string; 'place name'?: string; 'state abbreviation'?: string }> };
    const place = zipData.places?.[0];
    const latitude = Number(place?.latitude);
    const longitude = Number(place?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('ZIP_LOOKUP_FAILED');

    const useFahrenheit = navigator.language.toLowerCase().includes('us');
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: 'temperature_2m,apparent_temperature,weather_code',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',
      timezone: 'auto',
      forecast_days: '1',
      temperature_unit: useFahrenheit ? 'fahrenheit' : 'celsius',
    });
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    if (!response.ok) throw new Error('WEATHER_REQUEST_FAILED');
    const data = await response.json();
    const placeName = place?.['place name']?.trim();
    const stateName = place?.['state abbreviation']?.trim();
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
      zipCode: zip,
      locationLabel: placeName ? `${placeName}${stateName ? `, ${stateName}` : ''}` : `ZIP ${zip}`,
    };
    setWeather(next);
    setWeatherZip(zip);
    setWeatherZipDraft(zip);
    try {
      window.localStorage.setItem(WEATHER_ZIP_KEY, zip);
      window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(next));
    } catch {}
  } catch (error) {
    setWeatherMessage(error instanceof Error && error.message === 'ZIP_NOT_FOUND'
      ? 'That ZIP code was not found.'
      : 'Weather could not load right now.');
  } finally {
    setWeatherBusy(false);
  }
}, [weatherZip]);

useEffect(() => {
  if (!weather && /^\d{5}$/.test(weatherZip)) {
    const timer = window.setTimeout(() => { void loadWeather(weatherZip); }, 0);
    return () => window.clearTimeout(timer);
  }
}, [loadWeather, weather, weatherZip]);

function submitWeatherZip(event: FormEvent) {
  event.preventDefault();
  void loadWeather(weatherZipDraft);
}

  function updateQuickNote(value: string) {
    setQuickNote(value);
    setQuickNoteStatus(null);
    try { window.localStorage.setItem(QUICK_NOTE_KEY, value); } catch {}
  }

  async function saveQuickNote() {
    if (!quickNote.trim()) return;
    setQuickNoteStatus('Saving…');
    const content: NoteBlock[] = [{ id: crypto.randomUUID(), type: 'paragraph', text: quickNote.trim() }];
    const supabase = createClient();
    const { error } = await supabase.from('notes').insert({ user_id: state.userId, title: 'Quick Note', content, is_pinned: false });
    if (error) return setQuickNoteStatus('Could not save yet.');
    updateQuickNote('');
    setQuickNoteStatus('Saved to Notes');
  }

  function beginCustomize() {
    setEditBaseline(cloneWidgets(widgets));
    const currentLayout = readLayout();
    setLayoutBaseline(currentLayout);
    setLayoutDraft(currentLayout);
    setSelectedWidgetId(widgets.find((item) => item.visible)?.id ?? null);
    setEditingDashboard(true);
  }

  function saveAndExit() {
    saveDashboardLayout(widgets);
    saveLayout(layoutDraft);
    setEditBaseline(null);
    setLayoutBaseline(null);
    setSelectedWidgetId(null);
    setEditingDashboard(false);
  }

  function cancelCustomize() {
    if (editBaseline) setWidgets(cloneWidgets(editBaseline));
    if (layoutBaseline) {
      document.documentElement.dataset.relayLayout = layoutBaseline;
      setLayoutDraft(layoutBaseline);
    }
    setSelectedWidgetId(null);
    setEditingDashboard(false);
  }

  function previewLayout(next: RelayLayout) {
    setLayoutDraft(next);
    document.documentElement.dataset.relayLayout = next;
  }

  function submitRavin(event: FormEvent) {
    event.preventDefault();
    if (!ravinPrompt.trim()) return;
    setRavinMessage('RAVIN is not connected yet — this is the 1.1 prompt preview.');
  }

  function renderWidget(widget: DashboardWidgetPreference, index: number) {
    const fit = getWidgetFit(widget);
    const { compact, micro, short, narrow, wide, roomy, listLimit } = fit;

    switch (widget.id) {
      case 'overview':
        return <section className="grid h-full grid-cols-3 overflow-hidden rounded-lg border border-border bg-surface-raised"><OverviewStat value={tasksLeft} label="tasks left" compact={micro || narrow} /><OverviewStat value={upcomingEvents.length} label="upcoming" compact={micro || narrow} /><OverviewStat value={unreadChats} label="new chats" compact={micro || narrow} /></section>;

      case 'weather':
        return <DashboardCard widget={widget} index={index} icon={<CloudSun size={18} />} title="Weather">{weather ? (
          micro ? <div className="flex h-full items-center justify-between gap-2"><div className="min-w-0"><p className="font-display text-xl font-medium leading-none text-ink">{Math.round(weather.temperature)}{weather.unit}</p><p className="mt-1 truncate text-[10px] text-ink-muted">{weatherLabel(weather.weatherCode)}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={() => void loadWeather(weather.zipCode)} disabled={weatherBusy} title="Refresh weather" className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-ink-muted disabled:opacity-50">{weatherBusy ? '…' : '↻'}</button><button type="button" onClick={() => { setWeather(null); setWeatherZip(''); setWeatherMessage(null); setWeatherZipDraft(weather.zipCode); }} title="Change ZIP" className="rounded-md border border-border px-2 py-1 text-[10px] font-medium text-ink-muted">ZIP</button></div></div>
          : <><div className="flex items-end justify-between gap-3"><div className="min-w-0"><p className={`${compact ? 'text-2xl' : 'text-4xl'} font-display font-medium text-ink`}>{Math.round(weather.temperature)}{weather.unit}</p><p className="mt-1 truncate text-sm text-ink-muted">{weatherLabel(weather.weatherCode)}</p>{!short && <p className="mt-1 truncate text-[11px] text-ink-faint">{weather.locationLabel} · {weather.zipCode}</p>}</div><div className="shrink-0 text-right text-xs text-ink-faint"><p>Feels {Math.round(weather.apparent)}{weather.unit}</p><p className="mt-1">H {Math.round(weather.high)}° · L {Math.round(weather.low)}°</p></div></div>{roomy ? <div className="mt-3 grid grid-cols-2 gap-2"><MiniPanel dense={narrow} label="Rain" value={`${Math.round(weather.precip)}%`} detail="chance today" /><MiniPanel dense={narrow} label="Updated" value={formatRelative(weather.fetchedAt)} detail={`ZIP ${weather.zipCode}`} /></div> : <div className="mt-2 flex gap-3 text-[11px] text-ink-faint"><span>Rain {Math.round(weather.precip)}%</span><span>Updated {formatRelative(weather.fetchedAt)}</span></div>}<div className="mt-2 flex flex-wrap gap-x-3 text-xs font-medium"><button type="button" onClick={() => void loadWeather(weather.zipCode)} disabled={weatherBusy} className="text-ink-muted hover:text-ink disabled:opacity-50">{weatherBusy ? 'Refreshing…' : 'Refresh'}</button><button type="button" onClick={() => { setWeather(null); setWeatherZip(''); setWeatherMessage(null); setWeatherZipDraft(weather.zipCode); }} className="text-ink-faint hover:text-ink">Change ZIP</button></div></>
        ) : (
          micro ? <form onSubmit={submitWeatherZip} className="flex h-full items-center gap-1.5"><input value={weatherZipDraft} onChange={(event) => { setWeatherZipDraft(event.target.value.replace(/\D/g, '').slice(0, 5)); setWeatherMessage(null); }} inputMode="numeric" pattern="[0-9]{5}" maxLength={5} aria-label="Weather ZIP code" placeholder="ZIP" className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-2 py-1.5 text-xs text-ink outline-none" /><button type="submit" disabled={weatherBusy || weatherZipDraft.length !== 5} className="rounded-md bg-ink px-2 py-1.5 text-[10px] font-semibold text-canvas disabled:opacity-40">Load</button></form>
          : <div className="rounded-xl bg-surface p-3">{!short && <p className="mb-2 text-sm text-ink-muted">Enter a ZIP code for local weather.</p>}<form onSubmit={submitWeatherZip} className="flex gap-2"><input value={weatherZipDraft} onChange={(event) => { setWeatherZipDraft(event.target.value.replace(/\D/g, '').slice(0, 5)); setWeatherMessage(null); }} inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" maxLength={5} aria-label="Weather ZIP code" placeholder="ZIP code" className="min-w-0 flex-1 rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint" /><button type="submit" disabled={weatherBusy || weatherZipDraft.length !== 5} className="shrink-0 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-canvas disabled:opacity-50">{weatherBusy ? 'Loading…' : 'Load'}</button></form>{weatherMessage && !short && <p className="mt-2 text-xs text-ink-faint">{weatherMessage}</p>}</div>
        )}</DashboardCard>;

      case 'askravin':
        return <DashboardCard widget={widget} index={index} icon={<Sparkles size={18} />} title="Ask RAVIN" badge="Preview"><form onSubmit={submitRavin} className={`rounded-xl border border-border bg-canvas ${micro ? 'p-1' : 'p-2'}`}><div className="flex items-center gap-2"><input value={ravinPrompt} onChange={(event) => { setRavinPrompt(event.target.value); setRavinMessage(null); }} placeholder="Ask RAVIN…" className={`min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-faint ${micro ? 'px-1 text-xs' : 'px-2 py-2 text-sm'}`} /><button type="button" onClick={() => setRavinMessage('Voice is coming with the full RAVIN connection.')} aria-label="Preview RAVIN microphone orb" className={`relative grid shrink-0 place-items-center rounded-full border border-border bg-surface text-ink ${micro ? 'h-7 w-7' : 'h-10 w-10'}`}><Mic size={micro ? 13 : 16} className="relative" /></button>{!compact && <button type="submit" disabled={!ravinPrompt.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-canvas disabled:opacity-35"><Send size={15} /></button>}</div></form>{!short && <div className="mt-3 flex items-center justify-between gap-3"><p className="line-clamp-2 text-xs leading-5 text-ink-faint">Future RAVIN will use Relay context like To‑Do, Calendar, Notes, and files.</p><span className="shrink-0 rounded-full border border-border px-2 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-ink-muted">1.1</span></div>}{ravinMessage && !micro && <p className="mt-2 truncate rounded-lg bg-surface px-3 py-2 text-xs text-ink-muted">{ravinMessage}</p>}</DashboardCard>;

      case 'tasks': {
        const shownTasks = todayTodos.slice(0, micro ? 1 : short ? Math.min(2, listLimit) : listLimit);
        return <DashboardCard widget={widget} index={index} icon={<ListTodo size={18} />} title="To-Do" href="/todo" linkLabel="Open week">{state.taskError ? <EmptyState compact={short}>Tasks could not load.</EmptyState> : todayTodos.length === 0 ? <EmptyState compact={short}>Nothing on your list yet.</EmptyState> : <ul className={micro ? '' : 'space-y-1'}>{shownTasks.map((todo) => <li key={todo.id} className={`flex items-center gap-2 rounded-md px-1 ${micro ? 'py-1' : 'py-1.5'}`}><button type="button" disabled={taskBusy === todo.id} onClick={() => toggleTodayTask(todo)} className={`flex shrink-0 items-center justify-center rounded border ${micro ? 'h-4 w-4' : 'h-5 w-5'} ${todo.completed ? 'border-ink bg-ink text-canvas' : 'border-ink-faint text-transparent'}`}><Check size={micro ? 10 : 13} /></button><span className={`truncate ${micro ? 'text-xs' : 'text-sm'} ${todo.completed ? 'text-ink-faint line-through' : 'text-ink'}`}>{todo.title}</span></li>)}</ul>}{!micro && !short && <form onSubmit={addTodayTask} className="mt-3 flex gap-2 border-t border-border pt-3"><input value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} placeholder="Quick add for today…" className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none" /><button type="submit" disabled={taskBusy === 'new' || !taskDraft.trim()} className="grid h-9 w-9 place-items-center rounded-md bg-ink text-canvas disabled:opacity-40"><Plus size={16} /></button></form>}{taskMessage && !micro && <p className="mt-2 truncate text-xs text-red-600">{taskMessage}</p>}</DashboardCard>;
      }

      case 'calendar':
        return <DashboardCard widget={widget} index={index} icon={<CalendarDays size={18} />} title="Next Up" href="/calendar" linkLabel="Calendar">{upcomingEvents.length ? <EventList events={upcomingEvents.slice(0, listLimit)} compact={compact} micro={micro} /> : <EmptyState compact={short}>{state.calendarConnected ? 'Nothing else is scheduled.' : 'Connect Calendar for your full schedule.'}</EmptyState>}</DashboardCard>;

      case 'today':
        return <DashboardCard widget={widget} index={index} icon={<Gauge size={18} />} title="Today">{micro ? <div className="grid h-full grid-cols-3 items-center gap-1 text-center"><TinyMetric value={String(tasksLeft)} label="tasks" /><TinyMetric value={upcomingEvents[0] ? formatDashboardEventTime(upcomingEvents[0]) : 'Open'} label="next" /><TinyMetric value={String(unreadChats)} label="chats" /></div> : <div className={`grid gap-2 ${wide ? 'grid-cols-3' : narrow ? 'grid-cols-1' : 'grid-cols-2'}`}><MiniPanel dense={short || narrow} label="Tasks" value={tasksLeft ? `${tasksLeft} left` : 'All clear'} detail={todayTodos.find((todo) => !todo.completed)?.title ?? 'No tasks due'} /><MiniPanel dense={short || narrow} label="Next" value={upcomingEvents[0] ? formatDashboardEventTime(upcomingEvents[0]) : 'Open'} detail={upcomingEvents[0]?.title ?? 'No upcoming event'} />{(wide || roomy) && <MiniPanel dense={short || narrow} label="Messages" value={unreadChats ? `${unreadChats} unread` : 'Caught up'} detail={state.chatNotifications[0]?.title ?? 'No new chats'} />}</div>}</DashboardCard>;

      case 'chats':
        return <DashboardCard widget={widget} index={index} icon={<MessageCircle size={18} />} title="Chats" href="/chats" linkLabel="Chats">{state.chatNotifications.length ? <ul className="divide-y divide-border">{state.chatNotifications.slice(0, listLimit).map((notification) => <li key={notification.id}><a href={appPageUrl(normalizeAppLink(notification.link ?? '/chats'))} onClick={() => openNotification(notification)} className={`flex items-start gap-2 ${micro ? 'py-1' : 'py-2'}`}><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? 'bg-border' : 'bg-blue-500'}`} /><div className="min-w-0 flex-1"><p className={`truncate font-medium text-ink ${micro ? 'text-xs' : 'text-sm'}`}>{notification.title}</p>{!compact && <p className="mt-1 truncate text-xs text-ink-faint">{notification.body}</p>}</div></a></li>)}</ul> : <EmptyState compact={short}>No new chat notifications.</EmptyState>}</DashboardCard>;

      case 'quicknote':
        return <DashboardCard widget={widget} index={index} icon={<NotebookPen size={18} />} title="Quick Note" href="/notes" linkLabel="Notes">{micro ? <div className="flex h-full items-center gap-1.5"><input value={quickNote} onChange={(event) => updateQuickNote(event.target.value)} placeholder="Quick note…" className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-2 py-1.5 text-xs text-ink outline-none" /><button type="button" onClick={saveQuickNote} disabled={!quickNote.trim()} aria-label="Save quick note" className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ink text-canvas disabled:opacity-35"><Check size={13} /></button></div> : <><textarea value={quickNote} onChange={(event) => updateQuickNote(event.target.value)} rows={roomy ? 7 : short ? 2 : 4} placeholder="Capture something before it disappears…" className={`w-full resize-none rounded-xl border border-border bg-canvas text-sm text-ink outline-none ${short ? 'p-2 leading-5' : 'p-3 leading-6'}`} /><div className="mt-2 flex items-center justify-between gap-3"><span className="truncate text-xs text-ink-faint">{quickNoteStatus ?? 'Draft saved locally.'}</span><button type="button" onClick={saveQuickNote} disabled={!quickNote.trim()} className="shrink-0 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-canvas disabled:opacity-35">Save</button></div></>}</DashboardCard>;

      case 'focus':
        return <DashboardCard widget={widget} index={index} icon={<TimerReset size={18} />} title="Focus"><div className={`flex ${micro ? 'h-full items-center justify-between' : 'flex-col items-center text-center'}`}><div><p className={`${micro ? 'text-xl' : compact ? 'text-2xl' : 'text-4xl'} font-mono font-semibold text-ink`}>{formatTimer(focusSeconds)}</p>{!short && <p className="mt-1 text-xs text-ink-faint">{focusSeconds === 0 ? 'Session complete' : focusRunning ? 'Focus session running' : 'Pick a block and lock in'}</p>}</div><div className={`${micro ? 'flex' : 'mt-3 flex justify-center'} gap-1.5`}><button type="button" onClick={() => { if (focusSeconds === 0) setFocusSeconds(25 * 60); setFocusRunning((value) => !value); }} className={`grid place-items-center rounded-full bg-ink text-canvas ${micro ? 'h-7 w-7' : 'h-9 w-9'}`}>{focusRunning ? <Pause size={micro ? 12 : 15} /> : <Play size={micro ? 12 : 15} />}</button><button type="button" onClick={() => { setFocusRunning(false); setFocusSeconds(25 * 60); }} className={`grid place-items-center rounded-full border border-border text-ink-muted ${micro ? 'h-7 w-7' : 'h-9 w-9'}`}><RotateCcw size={micro ? 11 : 14} /></button></div></div>{!short && <div className="mt-3 grid grid-cols-3 gap-2">{[25, 45, 60].map((minutes) => <button key={minutes} type="button" onClick={() => { setFocusRunning(false); setFocusSeconds(minutes * 60); }} className="rounded-lg border border-border bg-canvas px-2 py-2 text-xs text-ink-muted">{minutes}m</button>)}</div>}</DashboardCard>;

      case 'dayprogress': {
        const progress = dayProgress(now);
        return <DashboardCard widget={widget} index={index} icon={<Gauge size={18} />} title="Day Progress"><div className={`flex ${micro ? 'h-full items-center gap-3' : 'items-end justify-between'}`}><p className={`${micro ? 'text-xl' : compact ? 'text-2xl' : 'text-4xl'} shrink-0 font-display font-medium text-ink`}>{progress}%</p>{micro ? <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-ink" style={{ width: `${progress}%` }} /></div> : <>{!compact && <p className="text-xs text-ink-faint">7 AM → 11 PM</p>}</>}</div>{!micro && <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-ink" style={{ width: `${progress}%` }} /></div>}</DashboardCard>;
      }

      case 'assignments':
        return <DashboardCard widget={widget} index={index} icon={<BookOpen size={18} />} title="Assignments" href="/todo" linkLabel="To-Do">{futureTodos.length ? <ul className="divide-y divide-border">{futureTodos.slice(0, listLimit).map((todo) => <li key={todo.id} className={`flex items-center justify-between gap-2 ${micro ? 'py-1' : 'py-2'}`}><p className={`truncate text-ink ${micro ? 'text-xs' : 'text-sm'}`}>{todo.title}</p><time className={`shrink-0 text-ink-faint ${micro ? 'text-[10px]' : 'text-xs'}`}>{formatShortDate(`${todo.due_on}T12:00:00`)}</time></li>)}</ul> : <EmptyState compact={short}>No upcoming incomplete tasks.</EmptyState>}</DashboardCard>;

      case 'momentum': {
        const total = todayTodos.length;
        const percent = total ? Math.round((completedToday / total) * 100) : 0;
        return <DashboardCard widget={widget} index={index} icon={<Zap size={18} />} title="Momentum"><div className={micro ? 'flex h-full items-center gap-3' : ''}><p className={`${micro ? 'text-xl' : compact ? 'text-2xl' : 'text-4xl'} shrink-0 font-display font-medium text-ink`}>{percent}%</p>{!short && <p className="mt-1 text-xs text-ink-faint">{completedToday} of {total} tasks complete today</p>}<div className={`${micro ? 'min-w-0 flex-1' : 'mt-3'} h-2 overflow-hidden rounded-full bg-surface`}><div className="h-full rounded-full bg-ink" style={{ width: `${percent}%` }} /></div></div></DashboardCard>;
      }

      case 'sun':
        return <DashboardCard widget={widget} index={index} icon={<Sun size={18} />} title="Sunrise / Sunset">{weather ? micro ? <div className="grid h-full grid-cols-2 items-center gap-2 text-center"><TinyMetric value={formatClock(weather.sunrise)} label="rise" /><TinyMetric value={formatClock(weather.sunset)} label="set" /></div> : <div className={`grid gap-2 ${narrow ? 'grid-cols-1' : 'grid-cols-2'}`}><MiniPanel dense={short || narrow} label="Sunrise" value={formatClock(weather.sunrise)} detail="Morning" />{(!narrow || roomy) && <MiniPanel dense={short || narrow} label="Sunset" value={formatClock(weather.sunset)} detail="Evening" />}</div> : <EmptyState compact={short}>Set a Weather ZIP first.</EmptyState>}</DashboardCard>;

      case 'countdowns': {
        const event = nextCountdownEvent;
        const allDayLabel = event ? (localDateKey(new Date(event.startsAt)) === today ? 'Today' : formatShortDate(event.startsAt)) : '';
        return <DashboardCard widget={widget} index={index} icon={<FileClock size={18} />} title="Countdowns">{event ? micro ? <div className="flex h-full items-center justify-between gap-2"><p className="min-w-0 truncate text-xs font-medium text-ink">{event.title}</p><p className="shrink-0 font-display text-sm font-medium text-ink">{event.isAllDay ? allDayLabel : formatCountdown(event.startsAt, now)}</p></div> : <div className={`rounded-xl bg-surface ${short ? 'p-2' : 'p-3'}`}><p className="truncate text-sm font-semibold text-ink">{event.title}</p><p className={`mt-1 font-display ${compact ? 'text-lg' : 'text-2xl'} font-medium text-ink`}>{event.isAllDay ? allDayLabel : formatCountdown(event.startsAt, now)}</p>{!short && <p className="mt-1 truncate text-xs text-ink-faint">{event.source}</p>}</div> : <EmptyState compact={short}>No upcoming timed events.</EmptyState>}</DashboardCard>;
      }

      case 'schoolschedule':
        return <DashboardCard widget={widget} index={index} icon={<School size={18} />} title="School Schedule" href="/calendar" linkLabel="Calendar">{upcomingEvents.length ? <EventList events={upcomingEvents.slice(0, listLimit)} compact={compact} micro={micro} /> : <EmptyState compact={short}>Add your class schedule to Calendar.</EmptyState>}</DashboardCard>;

      case 'ravinbrief':
        return <DashboardCard widget={widget} index={index} icon={<WandSparkles size={18} />} title="RAVIN Brief" badge="Preview">{micro ? <div className="grid h-full grid-cols-3 items-center gap-1 text-center"><TinyMetric value={tasksLeft ? String(tasksLeft) : '0'} label="tasks" /><TinyMetric value={state.events[0] ? formatDashboardEventTime(state.events[0]) : 'Open'} label="next" /><TinyMetric value={String(unreadChats)} label="chats" /></div> : <div className={`grid gap-2 ${wide ? 'grid-cols-3' : narrow ? 'grid-cols-1' : 'grid-cols-2'}`}><MiniPanel dense={short || narrow} label="Priority" value={tasksLeft ? `${tasksLeft} tasks` : 'Clear'} detail={todayTodos.find((todo) => !todo.completed)?.title ?? 'Nothing urgent'} /><MiniPanel dense={short || narrow} label="Schedule" value={state.events[0] ? formatDashboardEventTime(state.events[0]) : 'Open'} detail={state.events[0]?.title ?? 'No next event'} />{(wide || roomy) && <MiniPanel dense={short || narrow} label="Chats" value={unreadChats ? `${unreadChats} chats` : 'Quiet'} detail="Full AI brief arrives with RAVIN" />}</div>}</DashboardCard>;

      case 'nowplaying':
        return <PlaceholderCard widget={widget} index={index} icon={<Music2 size={18} />} title="Now Playing" text="Music controls will appear here when Relay’s music connector is enabled." />;

      case 'pinnedpeople':
        return <PlaceholderCard widget={widget} index={index} icon={<Users size={18} />} title="Pinned People" text="Pin favorite contacts for one-click chats and presence." href="/contacts" />;

      case 'recentfiles':
        return <PlaceholderCard widget={widget} index={index} icon={<FileClock size={18} />} title="Recent Files" text="Recent Relay and connected files will live here once file connectors are enabled." href="/notes" />;

      case 'quicklinks': {
        const links = [
          { href: '/todo', icon: <ListTodo size={17} />, label: 'To-Do' },
          { href: '/planner', icon: <CalendarDays size={17} />, label: 'Planner' },
          { href: '/chats', icon: <MessageCircle size={17} />, label: 'Chats' },
          { href: '/notes', icon: <NotebookPen size={17} />, label: 'Notes' },
        ];
        return <section className={`grid h-full gap-2 ${micro ? 'grid-cols-4' : wide ? 'grid-cols-4' : 'grid-cols-2'}`}>{links.map((link) => <QuickLink key={link.href} {...link} compact={micro || (short && narrow)} />)}</section>;
      }
    }
  }

  const activeWidgets = isDesktop ? widgets : DEFAULT_DASHBOARD_LAYOUT;
  const visibleWidgets = activeWidgets.filter((widget) => widget.visible);

  const dashboardGrid = (
    <div className="relay-dashboard-grid mt-5 grid grid-cols-1 gap-4 md:grid-cols-12" style={isDesktop ? { gridAutoRows: '92px' } : undefined}>
      {visibleWidgets.map((widget, index) => (
        <div
          key={widget.id}
          className="relay-dashboard-widget min-h-0 min-w-0"
          style={isDesktop ? { gridColumn: `span ${widget.cols} / span ${widget.cols}`, gridRow: `span ${widget.rows} / span ${widget.rows}` } : undefined}
        >
          <div className="h-full min-h-0 overflow-hidden rounded-xl">{renderWidget(widget, index)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="relay-dashboard mx-auto max-w-6xl px-4 py-5 md:px-6 md:py-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm text-ink-muted">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1 className="mt-1 font-display text-3xl font-medium tracking-tight text-ink">{state.firstName ? `Hey, ${state.firstName}.` : 'Hey.'}</h1></div>
        <div className="flex items-end gap-4 sm:text-right"><div><p className="font-display text-3xl font-medium tabular-nums text-ink">{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p><p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-faint">Your day at a glance</p></div><button type="button" onClick={beginCustomize} className="hidden min-h-10 items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 text-sm font-medium text-ink transition hover:bg-surface md:inline-flex"><LayoutDashboard size={15} />Customize dashboard</button></div>
      </header>

      {dashboardGrid}

      {editingDashboard && isDesktop && (
        <DashboardStudio
          widgets={widgets}
          widgetMeta={WIDGET_META}
          selectedId={selectedWidgetId}
          layoutDraft={layoutDraft}
          onSelect={setSelectedWidgetId}
          onWidgetsChange={updateWidgets}
          onLayoutChange={previewLayout}
          onCancel={cancelCustomize}
          onSave={saveAndExit}
          renderWidget={renderWidget}
        />
      )}
    </div>
  );
}

type WidgetFit = {
  micro: boolean;
  short: boolean;
  narrow: boolean;
  wide: boolean;
  roomy: boolean;
  compact: boolean;
  listLimit: number;
};

function getWidgetFit(widget: DashboardWidgetPreference): WidgetFit {
  const micro = widget.rows <= 1;
  const short = widget.rows <= 2;
  const narrow = widget.cols <= 4;
  const wide = widget.cols >= 8;
  const roomy = widget.rows >= 4;
  const compact = micro || (short && narrow);
  const listLimit = micro
    ? 1
    : widget.rows === 2
      ? 2
      : widget.rows === 3
        ? (narrow ? 3 : 4)
        : widget.rows === 4
          ? (narrow ? 4 : 5)
          : Math.min(7, widget.rows + 1);
  return { micro, short, narrow, wide, roomy, compact, listLimit };
}

function DashboardCard({ widget, icon, title, href, linkLabel, badge, children, index }: { widget: DashboardWidgetPreference; icon: ReactNode; title: string; href?: string; linkLabel?: string; badge?: string; children: ReactNode; index: number }) {
  const fit = getWidgetFit(widget);
  return (
    <section className={`relay-motion-dashboard-card flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface-raised ${fit.micro ? 'p-2' : fit.compact ? 'p-3' : 'p-4'}`} style={{ animationDelay: `${150 + index * 70}ms` }}>
      <header className={`${fit.micro ? 'mb-1' : fit.compact ? 'mb-2' : 'mb-3'} flex shrink-0 items-center justify-between gap-2`}>
        <div className="flex min-w-0 items-center gap-2 text-ink"><span className="shrink-0 text-ink-muted">{icon}</span><h2 className={`truncate font-medium ${fit.micro ? 'text-xs' : fit.compact ? 'text-sm' : ''}`}>{title}</h2>{badge && !fit.compact && <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-semibold uppercase text-ink-faint">{badge}</span>}</div>
        {href && linkLabel && <a href={appPageUrl(href)} aria-label={linkLabel} title={linkLabel} className={`inline-flex shrink-0 items-center text-ink-muted hover:text-ink ${fit.compact ? 'h-6 w-6 justify-center rounded-md' : 'gap-1 text-xs font-medium'}`}>{!fit.compact && linkLabel}<ArrowRight size={fit.compact ? 12 : 13} /></a>}
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function PlaceholderCard({ widget, icon, title, text, href, index }: { widget: DashboardWidgetPreference; icon: ReactNode; title: string; text: string; href?: string; index: number }) {
  const fit = getWidgetFit(widget);
  return <DashboardCard widget={widget} index={index} icon={icon} title={title} badge="Soon"><div className={`h-full rounded-xl border border-dashed border-border bg-surface ${fit.micro ? 'flex items-center p-2' : 'p-3'}`}><p className={`${fit.micro ? 'line-clamp-1 text-[10px]' : fit.compact ? 'line-clamp-2 text-xs' : 'line-clamp-3 text-sm leading-6'} text-ink-muted`}>{text}</p>{href && !fit.short && <a href={appPageUrl(href)} className="ml-auto mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink">Open<ArrowRight size={13} /></a>}</div></DashboardCard>;
}

function EventList({ events, compact, micro = false }: { events: DashboardEvent[]; compact: boolean; micro?: boolean }) {
  return <ul className="divide-y divide-border">{events.map((event) => {
    const content = <><div className="min-w-0"><p className={`truncate font-medium text-ink ${micro ? 'text-xs' : 'text-sm'}`}>{event.title}</p>{!compact && <p className="mt-1 truncate text-xs text-ink-faint">{event.source}</p>}</div><time className={`shrink-0 text-ink-muted ${micro ? 'text-[10px]' : 'text-xs'}`}>{formatDashboardEventTime(event)}</time></>;
    return <li key={event.id}>{event.href ? <a href={event.external ? event.href : appPageUrl(event.href)} target={event.external ? '_blank' : undefined} rel={event.external ? 'noreferrer' : undefined} className={`flex items-start justify-between gap-2 hover:opacity-70 ${micro ? 'py-1' : 'py-2'}`}>{content}</a> : <div className={`flex items-start justify-between gap-2 ${micro ? 'py-1' : 'py-2'}`}>{content}</div>}</li>;
  })}</ul>;
}

function OverviewStat({ value, label, compact = false }: { value: number; label: string; compact?: boolean }) {
  return <div className={`flex min-w-0 flex-col justify-center border-r border-border text-center last:border-r-0 ${compact ? 'px-1 py-1' : 'px-3 py-3'}`}><p className={`font-display font-medium text-ink ${compact ? 'text-lg' : 'text-2xl'}`}>{value}</p><p className={`${compact ? 'mt-0.5 truncate text-[9px]' : 'mt-1 text-xs'} text-ink-faint`}>{label}</p></div>;
}

function MiniPanel({ label, value, detail, dense = false }: { label: string; value: string; detail: string; dense?: boolean }) {
  return <div className={`min-w-0 rounded-xl border border-border bg-surface ${dense ? 'p-2' : 'p-3'}`}><p className={`${dense ? 'text-[9px]' : 'text-[10px]'} font-semibold uppercase tracking-[.12em] text-ink-faint`}>{label}</p><p className={`${dense ? 'mt-1 text-sm' : 'mt-2 text-lg'} truncate font-medium text-ink`}>{value}</p>{!dense && <p className="mt-1 truncate text-xs text-ink-muted">{detail}</p>}</div>;
}

function TinyMetric({ value, label }: { value: string; label: string }) {
  return <div className="min-w-0"><p className="truncate text-xs font-semibold text-ink">{value}</p><p className="mt-0.5 truncate text-[9px] uppercase tracking-wide text-ink-faint">{label}</p></div>;
}

function EmptyState({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return <p className={`rounded-md bg-surface text-ink-faint ${compact ? 'px-2 py-2 text-xs leading-4' : 'px-3 py-4 text-sm leading-5'}`}>{children}</p>;
}

function QuickLink({ href, icon, label, compact = false }: { href: string; icon: ReactNode; label: string; compact?: boolean }) {
  return <a href={appPageUrl(href)} aria-label={label} title={label} className={`flex h-full min-h-0 items-center rounded-lg border border-border bg-surface-raised font-medium text-ink transition hover:bg-surface ${compact ? 'justify-center px-2 py-2' : 'justify-between px-4 py-3 text-sm'}`}><span className={`flex items-center ${compact ? '' : 'gap-2'}`}><span className="text-ink-muted">{icon}</span>{!compact && label}</span>{!compact && <ArrowRight size={15} className="text-ink-faint" />}</a>;
}

function formatShortDate(raw: string) { const date = new Date(raw); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function formatEventTime(raw: string) { const date = new Date(raw); return localDateKey(date) === localDateKey() ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }); }
function formatDashboardEventTime(event: DashboardEvent) { return event.isAllDay ? (localDateKey(new Date(event.startsAt)) === localDateKey() ? 'All day' : formatShortDate(event.startsAt)) : formatEventTime(event.startsAt); }
function formatRelative(raw: string) { const minutes = Math.max(0, Math.round((Date.now() - new Date(raw).getTime()) / 60_000)); return minutes < 1 ? 'now' : minutes < 60 ? `${minutes}m` : minutes < 1440 ? `${Math.floor(minutes / 60)}h` : `${Math.floor(minutes / 1440)}d`; }
function formatTimer(seconds: number) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
function dayProgress(now: Date) { const start = new Date(now); start.setHours(7, 0, 0, 0); const end = new Date(now); end.setHours(23, 0, 0, 0); return Math.max(0, Math.min(100, Math.round(((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100))); }
function formatClock(raw: string) { const date = new Date(raw); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
function formatCountdown(raw: string, now: Date) { const diff = new Date(raw).getTime() - now.getTime(); if (diff <= 0) return 'Starting now'; const minutes = Math.floor(diff / 60_000); if (minutes < 1) return 'Under 1 min'; if (minutes < 60) return `${minutes} min`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ${minutes % 60}m`; return `${Math.floor(hours / 24)}d ${hours % 24}h`; }
function weatherLabel(code: number) { if (code === 0) return 'Clear'; if (code <= 3) return 'Partly cloudy'; if (code === 45 || code === 48) return 'Foggy'; if (code >= 51 && code <= 67) return 'Rain'; if (code >= 71 && code <= 77) return 'Snow'; if (code >= 80 && code <= 82) return 'Showers'; if (code >= 95) return 'Thunderstorms'; return 'Mixed conditions'; }
