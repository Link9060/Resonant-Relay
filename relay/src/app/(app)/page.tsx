'use client';

import { LayoutControls } from '@/components/profile/layout-controls';
import { PageLoading } from '@/components/page-loading';
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
  resetDashboardLayout,
  saveDashboardLayout,
  type DashboardWidgetId,
  type DashboardWidgetPreference,
  type DashboardWidgetSize,
} from '@/lib/dashboard-layout';
import { createClient } from '@/lib/supabase/client';
import type { Notification, Todo } from '@/lib/types/database';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  Check,
  Eye,
  EyeOff,
  GripVertical,
  LayoutDashboard,
  ListTodo,
  Mail,
  MessageCircle,
  Plus,
  RotateCcw,
  Settings2,
  X,
} from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  firstName: string | null;
  todos: Todo[];
  events: DashboardEvent[];
  emails: InboxMessage[];
  chatNotifications: Notification[];
  emailConnected: boolean;
  calendarConnected: boolean;
  taskError: boolean;
};

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
  overview: 'Daily overview',
  tasks: 'Today’s tasks',
  calendar: 'Up next',
  email: 'Recent email',
  chats: 'Newest chats',
  quicklinks: 'Quick actions',
};

const SIZE_LABELS: Record<DashboardWidgetSize, string> = {
  small: 'Small',
  medium: 'Medium',
  wide: 'Wide',
};

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [taskDraft, setTaskDraft] = useState('');
  const [taskBusy, setTaskBusy] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);
  const [freshTaskId, setFreshTaskId] = useState<string | null>(null);
  const [completedPulseId, setCompletedPulseId] = useState<string | null>(null);
  const [freshNotificationId, setFreshNotificationId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [editingDashboard, setEditingDashboard] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidgetPreference[]>(() => DEFAULT_DASHBOARD_LAYOUT.map((widget) => ({ ...widget })));
  const [draggingWidget, setDraggingWidget] = useState<DashboardWidgetId | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const syncDesktop = () => {
      setIsDesktop(media.matches);
      if (!media.matches) setEditingDashboard(false);
    };
    syncDesktop();
    media.addEventListener('change', syncDesktop);
    return () => media.removeEventListener('change', syncDesktop);
  }, []);

  useEffect(() => {
    const sync = () => setWidgets(readDashboardLayout());
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
  }, []);

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
        supabase.from('todos').select('*').eq('user_id', user.id).eq('due_on', today).order('completed').order('position').order('created_at'),
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
          }))
      );
      const googleEvents: DashboardEvent[] = (calendarResult.data?.events ?? []).map((event: any) => ({
        id: `calendar-${event.id}`,
        title: event.summary,
        startsAt: event.isAllDay ? `${event.start}T12:00:00` : event.start,
        source: event.accountEmail ?? `${event.provider === 'microsoft' ? 'Microsoft' : 'Google'} Calendar`,
        href: event.htmlLink || null,
        external: true,
      }));

      if (!active) return;
      setState({
        firstName: profileResult.data?.display_name?.split(' ')[0] ?? null,
        todos: todoResult.data ?? [],
        events: [...relayEvents, ...googleEvents]
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
          .slice(0, 5),
        emails: (emailResult.data?.messages ?? []).slice(0, 4),
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

  function openNotification(notification: Notification) {
    if (!notification.read_at) {
      const readAt = new Date().toISOString();
      setState((current) => current ? { ...current, chatNotifications: current.chatNotifications.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item) } : current);
      void markNotificationRead(notification.id);
    }
  }

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

  function updateWidgets(next: DashboardWidgetPreference[]) {
    setWidgets(normalizeDashboardLayout(next));
    saveDashboardLayout(next);
  }

  function moveWidget(id: DashboardWidgetId, direction: -1 | 1) {
    const index = widgets.findIndex((widget) => widget.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= widgets.length) return;
    const next = widgets.map((widget) => ({ ...widget }));
    const [moved] = next.splice(index, 1);
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
    const next = widgets.map((widget) => ({ ...widget }));
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraggingWidget(null);
    updateWidgets(next);
  }

  function resetWidgets() {
    resetDashboardLayout();
    setWidgets(DEFAULT_DASHBOARD_LAYOUT.map((widget) => ({ ...widget })));
  }

  if (!state) return <PageLoading />;

  const tasksLeft = state.todos.filter((todo) => !todo.completed).length;
  const unreadChats = state.chatNotifications.filter((notification) => !notification.read_at).length;
  const activeWidgets = isDesktop ? widgets : DEFAULT_DASHBOARD_LAYOUT;

  return (
    <div className={`relay-dashboard mx-auto max-w-6xl px-4 py-7 md:px-6 md:py-9 ${editingDashboard ? 'relay-dashboard-editing' : ''}`}>
      <header className="relay-motion-hero-in flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-muted">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-tight text-ink">{state.firstName ? `Hey, ${state.firstName}.` : 'Hey.'}</h1>
        </div>
        <div className="flex items-end gap-4 sm:text-right">
          <div>
            <p className="font-display text-3xl font-medium tabular-nums tracking-tight text-ink">{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-faint">Your day at a glance</p>
          </div>
          <button
            type="button"
            onClick={() => setEditingDashboard((current) => !current)}
            className={`hidden min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition md:inline-flex ${editingDashboard ? 'border-ink bg-ink text-canvas' : 'border-border bg-surface-raised text-ink hover:bg-surface'}`}
          >
            {editingDashboard ? <X size={15} /> : <Settings2 size={15} />}
            {editingDashboard ? 'Done' : 'Customize'}
          </button>
        </div>
      </header>

      {editingDashboard && isDesktop && (
        <section className="relay-dashboard-customizer mt-6 rounded-2xl border border-border bg-surface-raised p-4 md:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-ink"><LayoutDashboard size={17} /><h2 className="text-sm font-semibold">Customize desktop Relay</h2></div>
              <p className="mt-1 text-xs leading-5 text-ink-faint">Drag visible cards to reorder them, choose their width, or hide anything you do not need. These settings only affect this desktop browser.</p>
            </div>
            <button type="button" onClick={resetWidgets} className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-border bg-canvas px-3 text-xs font-medium text-ink hover:bg-surface"><RotateCcw size={13} />Reset widgets</button>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,.72fr)]">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.15em] text-ink-faint">Dashboard widgets</p>
              <div className="space-y-2">
                {widgets.map((widget, index) => (
                  <div key={widget.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-canvas p-2.5">
                    <GripVertical size={15} className="text-ink-faint" />
                    <div className="min-w-32 flex-1">
                      <div className="text-sm font-medium text-ink">{WIDGET_LABELS[widget.id]}</div>
                      <div className="text-[10px] uppercase tracking-wide text-ink-faint">{widget.visible ? SIZE_LABELS[widget.size] : 'Hidden'}</div>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
                      {(['small', 'medium', 'wide'] as DashboardWidgetSize[]).map((size) => (
                        <button key={size} type="button" disabled={!widget.visible} onClick={() => setWidgetSize(widget.id, size)} className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${widget.size === size && widget.visible ? 'bg-ink text-canvas' : 'text-ink-muted hover:bg-surface-raised'} disabled:opacity-35`}>{SIZE_LABELS[size]}</button>
                      ))}
                    </div>
                    <button type="button" onClick={() => moveWidget(widget.id, -1)} disabled={index === 0} aria-label={`Move ${WIDGET_LABELS[widget.id]} up`} className="grid h-8 w-8 place-items-center rounded-md border border-border text-ink-muted hover:bg-surface disabled:opacity-30"><ArrowUp size={13} /></button>
                    <button type="button" onClick={() => moveWidget(widget.id, 1)} disabled={index === widgets.length - 1} aria-label={`Move ${WIDGET_LABELS[widget.id]} down`} className="grid h-8 w-8 place-items-center rounded-md border border-border text-ink-muted hover:bg-surface disabled:opacity-30"><ArrowDown size={13} /></button>
                    <button type="button" onClick={() => toggleWidget(widget.id)} aria-label={`${widget.visible ? 'Hide' : 'Show'} ${WIDGET_LABELS[widget.id]}`} className="grid h-8 w-8 place-items-center rounded-md border border-border text-ink-muted hover:bg-surface">{widget.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                  </div>
                ))}
              </div>
            </div>
            <LayoutControls />
          </div>
        </section>
      )}

      <div className="relay-dashboard-grid mt-7 grid grid-cols-1 gap-5 md:grid-cols-12">
        {activeWidgets.filter((widget) => widget.visible).map((widget, index) => (
          <div
            key={widget.id}
            className="relay-dashboard-widget min-w-0 transition-[opacity,transform] duration-150"
            style={isDesktop ? { gridColumn: `span ${dashboardSpan(widget.size)} / span ${dashboardSpan(widget.size)}` } : undefined}
            draggable={Boolean(editingDashboard && isDesktop)}
            data-dragging={draggingWidget === widget.id ? 'true' : 'false'}
            onDragStart={() => setDraggingWidget(widget.id)}
            onDragEnd={() => setDraggingWidget(null)}
            onDragOver={(event) => { if (editingDashboard && isDesktop) event.preventDefault(); }}
            onDrop={(event) => { event.preventDefault(); dropWidget(widget.id); }}
          >
            {renderWidget(widget, index, {
              state,
              tasksLeft,
              unreadChats,
              taskBusy,
              taskDraft,
              taskMessage,
              freshTaskId,
              completedPulseId,
              freshNotificationId,
              setTaskDraft,
              addTodayTask,
              toggleTodayTask,
              openNotification,
            })}
          </div>
        ))}
      </div>

      {isDesktop && activeWidgets.every((widget) => !widget.visible) && (
        <button type="button" onClick={() => setEditingDashboard(true)} className="mt-7 w-full rounded-2xl border border-dashed border-border bg-surface px-5 py-12 text-center text-sm text-ink-muted hover:bg-surface-raised">Your dashboard is empty. Customize it to add widgets.</button>
      )}
    </div>
  );
}

type RenderContext = {
  state: DashboardState;
  tasksLeft: number;
  unreadChats: number;
  taskBusy: string | null;
  taskDraft: string;
  taskMessage: string | null;
  freshTaskId: string | null;
  completedPulseId: string | null;
  freshNotificationId: string | null;
  setTaskDraft: (value: string) => void;
  addTodayTask: (event: FormEvent) => Promise<void>;
  toggleTodayTask: (todo: Todo) => Promise<void>;
  openNotification: (notification: Notification) => void;
};

function renderWidget(widget: DashboardWidgetPreference, index: number, context: RenderContext) {
  const { state } = context;

  if (widget.id === 'overview') {
    return (
      <section aria-label="Daily overview" className="relay-motion-dashboard-strip grid h-full min-h-[92px] grid-cols-3 overflow-hidden rounded-lg border border-border bg-surface-raised">
        <OverviewStat value={context.tasksLeft} label="tasks left" delay={110} />
        <OverviewStat value={state.events.length} label="upcoming" delay={165} />
        <OverviewStat value={context.unreadChats} label="new chats" delay={220} />
      </section>
    );
  }

  if (widget.id === 'tasks') {
    return (
      <DashboardCard index={index} icon={<ListTodo size={18} />} title="Today’s tasks" href="/todo" linkLabel="Open week">
        {state.taskError ? <EmptyState>Tasks could not load.</EmptyState> : state.todos.length === 0 ? <EmptyState>Nothing on your list yet.</EmptyState> : (
          <ul className="space-y-1">
            {state.todos.slice(0, widget.size === 'small' ? 3 : 6).map((todo) => (
              <li key={todo.id} className={`flex items-center gap-3 rounded-md px-1 py-2 transition-colors ${context.freshTaskId === todo.id ? 'relay-motion-live-row' : ''}`}>
                <button type="button" disabled={context.taskBusy === todo.id} onClick={() => context.toggleTodayTask(todo)} aria-label={todo.completed ? `Mark ${todo.title} incomplete` : `Complete ${todo.title}`} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all duration-200 ${todo.completed ? 'border-ink bg-ink text-canvas' : 'border-ink-faint text-transparent'} disabled:opacity-50`}><Check size={13} strokeWidth={3} className={context.completedPulseId === todo.id ? 'relay-motion-check' : ''} /></button>
                <span className={`truncate text-sm transition-[color,opacity,text-decoration-color] duration-200 ${todo.completed ? 'text-ink-faint line-through' : 'text-ink'}`}>{todo.title}</span>
              </li>
            ))}
          </ul>
        )}
        {widget.size !== 'small' && (
          <form onSubmit={context.addTodayTask} className="mt-4 flex gap-2 border-t border-border pt-4">
            <input value={context.taskDraft} onChange={(event) => context.setTaskDraft(event.target.value)} maxLength={120} aria-label="Add a task for today" placeholder="Quick add for today…" className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted" />
            <button type="submit" disabled={context.taskBusy === 'new' || !context.taskDraft.trim()} aria-label="Add task" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink text-canvas disabled:opacity-40"><Plus size={17} /></button>
          </form>
        )}
        {context.taskMessage && <p className="relay-motion-row-in mt-2 text-sm text-red-600">{context.taskMessage}</p>}
      </DashboardCard>
    );
  }

  if (widget.id === 'calendar') {
    return (
      <DashboardCard index={index} icon={<CalendarDays size={18} />} title="Up next" href="/calendar" linkLabel="Calendar">
        {state.events.length === 0 ? <EmptyState>{state.calendarConnected ? 'Nothing else is scheduled.' : 'No Relay plans yet. Connect Calendar for your full schedule.'}</EmptyState> : (
          <ul className="divide-y divide-border">
            {state.events.slice(0, widget.size === 'small' ? 2 : 5).map((event) => {
              const content = <><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{event.title}</p>{widget.size !== 'small' && <p className="mt-1 truncate text-xs text-ink-faint">{event.source}</p>}</div><time className="shrink-0 text-xs text-ink-muted">{formatEventTime(event.startsAt)}</time></>;
              return <li key={event.id}>{event.href ? <a href={event.external ? event.href : appPageUrl(event.href)} target={event.external ? '_blank' : undefined} rel={event.external ? 'noreferrer' : undefined} className="flex items-start justify-between gap-3 py-3 hover:opacity-70">{content}</a> : <div className="flex items-start justify-between gap-3 py-3">{content}</div>}</li>;
            })}
          </ul>
        )}
      </DashboardCard>
    );
  }

  if (widget.id === 'email') {
    return (
      <DashboardCard index={index} icon={<Mail size={18} />} title="Recent email" href="/email" linkLabel="Inbox">
        {!state.emailConnected ? <EmptyState>Connect Google or Microsoft email to bring your latest messages here.</EmptyState> : state.emails.length === 0 ? <EmptyState>Your inbox is clear.</EmptyState> : (
          <ul className="divide-y divide-border">
            {state.emails.slice(0, widget.size === 'small' ? 2 : 4).map((email) => (
              <li key={email.id} className="flex items-start gap-3 py-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${email.isUnread ? 'bg-blue-500' : 'bg-border'}`} />
                <div className="min-w-0 flex-1"><p className={`truncate text-sm text-ink ${email.isUnread ? 'font-semibold' : ''}`}>{email.subject}</p>{widget.size !== 'small' && <p className="mt-1 truncate text-xs text-ink-faint">{cleanSender(email.from)}</p>}</div>
                {email.receivedAt && widget.size !== 'small' && <time className="shrink-0 text-xs text-ink-muted">{formatShortDate(email.receivedAt)}</time>}
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    );
  }

  if (widget.id === 'chats') {
    return (
      <DashboardCard index={index} icon={<MessageCircle size={18} />} title="Newest chats" href="/chats" linkLabel="Chats">
        {state.chatNotifications.length === 0 ? <EmptyState>No new chat notifications.</EmptyState> : (
          <ul className="divide-y divide-border">
            {state.chatNotifications.slice(0, widget.size === 'small' ? 2 : 4).map((notification) => (
              <li key={notification.id} className={context.freshNotificationId === notification.id ? 'relay-motion-live-row' : ''}>
                <a href={appPageUrl(normalizeAppLink(notification.link ?? '/chats'))} onClick={() => context.openNotification(notification)} className="flex items-start gap-3 py-3 hover:opacity-70">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full transition-all duration-200 ${notification.read_at ? 'bg-border' : 'bg-blue-500'}`} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{notification.title}</p>{widget.size !== 'small' && <p className="mt-1 truncate text-xs text-ink-faint">{notification.body}</p>}</div>
                  {widget.size !== 'small' && <time className="shrink-0 text-xs text-ink-muted">{formatRelative(notification.created_at)}</time>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    );
  }

  return (
    <section className={`grid h-full gap-3 ${widget.size === 'wide' ? 'sm:grid-cols-3' : 'grid-cols-1'}`}>
      <QuickLink index={0} href="/todo" icon={<ListTodo size={17} />} label="Plan this week" />
      <QuickLink index={1} href="/planner" icon={<CalendarDays size={17} />} label="Create a group plan" />
      <QuickLink index={2} href="/chats" icon={<MessageCircle size={17} />} label="Start a conversation" />
    </section>
  );
}

function OverviewStat({ value, label, delay }: { value: number; label: string; delay: number }) {
  return <div className="border-r border-border px-3 py-4 text-center last:border-r-0"><p key={value} className="relay-motion-stat font-display text-2xl font-medium tabular-nums text-ink" style={{ animationDelay: `${delay}ms` }}>{value}</p><p className="mt-1 text-xs text-ink-faint">{label}</p></div>;
}

function DashboardCard({ icon, title, href, linkLabel, children, index }: { icon: ReactNode; title: string; href: string; linkLabel: string; children: ReactNode; index: number }) {
  return <section className="relay-motion-dashboard-card h-full rounded-lg border border-border bg-surface-raised p-4 sm:p-5" style={{ animationDelay: `${150 + index * 80}ms` }}><header className="mb-3 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2 text-ink"><span className="shrink-0 text-ink-muted">{icon}</span><h2 className="truncate font-medium">{title}</h2></div><a href={appPageUrl(href)} className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink">{linkLabel}<ArrowRight size={13} /></a></header>{children}</section>;
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
