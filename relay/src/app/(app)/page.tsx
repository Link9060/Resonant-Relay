'use client';

import { PageLoading } from '@/components/page-loading';
import { createTodo, setTodoCompleted } from '@/lib/actions/todos';
import { markNotificationRead } from '@/lib/actions/notifications';
import { appPageUrl, normalizeAppLink } from '@/lib/config';
import { localDateKey } from '@/lib/date';
import { createClient } from '@/lib/supabase/client';
import type { Notification, Todo } from '@/lib/types/database';
import { ArrowRight, CalendarDays, Check, ListTodo, Mail, MessageCircle, Plus } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
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
  gmailConnected: boolean;
  calendarConnected: boolean;
  taskError: boolean;
};

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [taskDraft, setTaskDraft] = useState('');
  const [taskBusy, setTaskBusy] = useState<string | null>(null);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
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
        supabase.functions.invoke('google-hub', { body: { action: 'status', service: 'calendar' } }),
      ]);

      const groupIds = (membershipResult.data ?? []).map((membership) => membership.group_id);
      const gmailConnected = !emailAccounts.error && (emailAccounts.data?.accounts?.length ?? 0) > 0;
      const calendarConnected = !calendarStatus.error && Boolean(calendarStatus.data?.connected);

      const [planResult, gmailResult, calendarResult] = await Promise.all([
        groupIds.length
          ? supabase.from('plans').select('id,name,group:groups(name),instances:plan_instances(id,occurs_on)').in('group_id', groupIds)
          : Promise.resolve({ data: [], error: null }),
        gmailConnected
          ? supabase.functions.invoke('mail-hub', { body: { action: 'messages' } })
          : Promise.resolve({ data: { messages: [] }, error: null }),
        calendarConnected
          ? supabase.functions.invoke('google-hub', { body: { action: 'calendar_events', service: 'calendar' } })
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
        id: `google-${event.id}`,
        title: event.summary,
        startsAt: event.isAllDay ? `${event.start}T12:00:00` : event.start,
        source: 'Google Calendar',
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
        emails: (gmailResult.data?.messages ?? []).slice(0, 4),
        chatNotifications: notificationResult.data ?? [],
        gmailConnected,
        calendarConnected,
        taskError: Boolean(todoResult.error),
      });
      notificationChannel = supabase.channel(`dashboard-notifications:${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const incoming = payload.new as Notification;
        if (!incoming?.id || incoming.type !== 'new_message') return;
        setState((current) => current ? { ...current, chatNotifications: current.chatNotifications.some((item) => item.id === incoming.id) ? current.chatNotifications.map((item) => item.id === incoming.id ? incoming : item) : [incoming, ...current.chatNotifications].slice(0, 4) } : current);
      }).subscribe();
    })();
    return () => { active = false; if (notificationChannel) void supabase.removeChannel(notificationChannel); };
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
    if (!result.ok) { setTaskMessage(result.error); return; }
    setState((current) => current ? { ...current, todos: [...current.todos, result.data] } : current);
    setTaskDraft('');
  }

  async function toggleTodayTask(todo: Todo) {
    setTaskBusy(todo.id);
    setTaskMessage(null);
    const result = await setTodoCompleted(todo.id, !todo.completed);
    setTaskBusy(null);
    if (!result.ok) { setTaskMessage(result.error); return; }
    setState((current) => current ? { ...current, todos: current.todos.map((item) => item.id === todo.id ? result.data : item) } : current);
  }

  if (!state) return <PageLoading />;

  const tasksLeft = state.todos.filter((todo) => !todo.completed).length;
  const unreadChats = state.chatNotifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 md:px-6 md:py-9">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-ink-muted">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-tight text-ink">{state.firstName ? `Hey, ${state.firstName}.` : 'Hey.'}</h1>
        </div>
        <div className="sm:text-right">
          <p className="font-display text-3xl font-medium tabular-nums tracking-tight text-ink">{now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-ink-faint">Your day at a glance</p>
        </div>
      </header>

      <section aria-label="Daily overview" className="mt-7 grid grid-cols-3 overflow-hidden rounded-lg border border-border bg-surface-raised">
        <OverviewStat value={tasksLeft} label="tasks left" />
        <OverviewStat value={state.events.length} label="upcoming" />
        <OverviewStat value={unreadChats} label="new chats" />
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <DashboardCard icon={<ListTodo size={18} />} title="Today’s tasks" href="/todo" linkLabel="Open week">
          {state.taskError ? <EmptyState>Tasks could not load.</EmptyState> : state.todos.length === 0 ? <EmptyState>Nothing on your list yet.</EmptyState> : (
            <ul className="space-y-1">
              {state.todos.slice(0, 6).map((todo) => (
                <li key={todo.id} className="flex items-center gap-3 rounded-md px-1 py-2">
                  <button type="button" disabled={taskBusy === todo.id} onClick={() => toggleTodayTask(todo)} aria-label={todo.completed ? `Mark ${todo.title} incomplete` : `Complete ${todo.title}`} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${todo.completed ? 'border-ink bg-ink text-canvas' : 'border-ink-faint text-transparent'} disabled:opacity-50`}><Check size={13} strokeWidth={3} /></button>
                  <span className={`text-sm ${todo.completed ? 'text-ink-faint line-through' : 'text-ink'}`}>{todo.title}</span>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={addTodayTask} className="mt-4 flex gap-2 border-t border-border pt-4">
            <input value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} maxLength={120} aria-label="Add a task for today" placeholder="Quick add for today…" className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted" />
            <button type="submit" disabled={taskBusy === 'new' || !taskDraft.trim()} aria-label="Add task" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink text-canvas disabled:opacity-40"><Plus size={17} /></button>
          </form>
          {taskMessage && <p className="mt-2 text-sm text-red-600">{taskMessage}</p>}
        </DashboardCard>

        <DashboardCard icon={<CalendarDays size={18} />} title="Up next" href="/calendar" linkLabel="Calendar">
          {state.events.length === 0 ? <EmptyState>{state.calendarConnected ? 'Nothing else is scheduled.' : 'No Relay plans yet. Connect Calendar for your full schedule.'}</EmptyState> : (
            <ul className="divide-y divide-border">
              {state.events.map((event) => {
                const content = <><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{event.title}</p><p className="mt-1 truncate text-xs text-ink-faint">{event.source}</p></div><time className="shrink-0 text-xs text-ink-muted">{formatEventTime(event.startsAt)}</time></>;
                return <li key={event.id}>{event.href ? <a href={event.external ? event.href : appPageUrl(event.href)} target={event.external ? '_blank' : undefined} rel={event.external ? 'noreferrer' : undefined} className="flex items-start justify-between gap-3 py-3 hover:opacity-70">{content}</a> : <div className="flex items-start justify-between gap-3 py-3">{content}</div>}</li>;
              })}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard icon={<Mail size={18} />} title="Recent email" href="/email" linkLabel="Inbox">
          {!state.gmailConnected ? <EmptyState>Connect Google or Microsoft email to bring your latest messages here.</EmptyState> : state.emails.length === 0 ? <EmptyState>Your inbox is clear.</EmptyState> : (
            <ul className="divide-y divide-border">
              {state.emails.map((email) => (
                <li key={email.id} className="flex items-start gap-3 py-3">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${email.isUnread ? 'bg-blue-500' : 'bg-border'}`} />
                  <div className="min-w-0 flex-1"><p className={`truncate text-sm text-ink ${email.isUnread ? 'font-semibold' : ''}`}>{email.subject}</p><p className="mt-1 truncate text-xs text-ink-faint">{cleanSender(email.from)}</p></div>
                  {email.receivedAt && <time className="shrink-0 text-xs text-ink-muted">{formatShortDate(email.receivedAt)}</time>}
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard icon={<MessageCircle size={18} />} title="Newest chats" href="/chats" linkLabel="Chats">
          {state.chatNotifications.length === 0 ? <EmptyState>No new chat notifications.</EmptyState> : (
            <ul className="divide-y divide-border">
              {state.chatNotifications.map((notification) => (
                <li key={notification.id}>
                  <a href={appPageUrl(normalizeAppLink(notification.link ?? '/chats'))} onClick={() => openNotification(notification)} className="flex items-start gap-3 py-3 hover:opacity-70">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? 'bg-border' : 'bg-blue-500'}`} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{notification.title}</p><p className="mt-1 truncate text-xs text-ink-faint">{notification.body}</p></div>
                    <time className="shrink-0 text-xs text-ink-muted">{formatRelative(notification.created_at)}</time>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <QuickLink href="/todo" icon={<ListTodo size={17} />} label="Plan this week" />
        <QuickLink href="/planner" icon={<CalendarDays size={17} />} label="Create a group plan" />
        <QuickLink href="/chats" icon={<MessageCircle size={17} />} label="Start a conversation" />
      </section>
    </div>
  );
}

function OverviewStat({ value, label }: { value: number; label: string }) {
  return <div className="border-r border-border px-3 py-4 text-center last:border-r-0"><p className="font-display text-2xl font-medium tabular-nums text-ink">{value}</p><p className="mt-1 text-xs text-ink-faint">{label}</p></div>;
}

function DashboardCard({ icon, title, href, linkLabel, children }: { icon: ReactNode; title: string; href: string; linkLabel: string; children: ReactNode }) {
  return <section className="rounded-lg border border-border bg-surface-raised p-4 sm:p-5"><header className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-ink"><span className="text-ink-muted">{icon}</span><h2 className="font-medium">{title}</h2></div><a href={appPageUrl(href)} className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink">{linkLabel}<ArrowRight size={13} /></a></header>{children}</section>;
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-surface px-3 py-5 text-sm leading-5 text-ink-faint">{children}</p>;
}

function QuickLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return <a href={appPageUrl(href)} className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"><span className="flex items-center gap-2"><span className="text-ink-muted">{icon}</span>{label}</span><ArrowRight size={15} className="text-ink-faint" /></a>;
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
