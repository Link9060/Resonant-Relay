'use client';

import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import {
  clearTodoSchedule,
  createScheduleBlock,
  deleteScheduleBlock,
  moveScheduleBlock,
  scheduleTodo,
  setTodoEstimate,
  type ScheduleBlock,
  type ScheduleBlockKind,
  type ScheduleTodo,
} from '@/lib/actions/schedule';
import { addDays, localDateKey, mondayOfWeek } from '@/lib/date';
import { createClient } from '@/lib/supabase/client';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, GripVertical, ListTodo, Lock, Plus, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type ProviderEvent = {
  id: string;
  summary: string;
  start: string;
  end?: string | null;
  isAllDay: boolean;
  htmlLink?: string | null;
  accountEmail?: string | null;
  calendarName?: string | null;
};

type RelayPlan = {
  id: string;
  instanceId: string;
  occursOn: string;
  name: string;
  groupName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

type TimelineItem = {
  id: string;
  title: string;
  source: 'todo' | 'manual' | 'planner' | 'calendar';
  startMinute: number;
  endMinute: number;
  detail: string;
  href?: string | null;
  todo?: ScheduleTodo;
  block?: ScheduleBlock;
};

type ScheduleState = {
  todos: ScheduleTodo[];
  blocks: ScheduleBlock[];
  events: ProviderEvent[];
  plans: RelayPlan[];
};

const START_MINUTE = 5 * 60;
const END_MINUTE = 24 * 60;
const PX_PER_MINUTE = 0.9;
const SNAP_MINUTES = 15;
const DEFAULT_ESTIMATE = 45;
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];
const KINDS: Array<{ value: ScheduleBlockKind; label: string }> = [
  { value: 'personal', label: 'Personal' },
  { value: 'focus', label: 'Focus' },
  { value: 'break', label: 'Break' },
  { value: 'routine', label: 'Routine' },
];

export default function SchedulePage() {
  const [state, setState] = useState<ScheduleState | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => localDateKey());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockStart, setBlockStart] = useState('18:00');
  const [blockDuration, setBlockDuration] = useState(30);
  const [blockKind, setBlockKind] = useState<ScheduleBlockKind>('personal');
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const today = new Date();
      const rangeStart = localDateKey(addDays(today, -30));
      const rangeEnd = localDateKey(addDays(today, 120));

      const [todoResult, blockResult, eventResult, membershipResult] = await Promise.all([
        supabase.from('todos').select('*').eq('user_id', user.id).eq('completed', false).order('due_on').order('position').limit(150),
        supabase.from('schedule_blocks').select('*').eq('user_id', user.id).gte('occurs_on', rangeStart).lte('occurs_on', rangeEnd).order('occurs_on').order('start_time'),
        supabase.functions.invoke('mail-hub', { body: { action: 'calendar_events' } }),
        supabase.from('group_members').select('group_id').eq('user_id', user.id),
      ]);

      const groupIds = (membershipResult.data ?? []).map((membership: any) => membership.group_id);
      let plans: RelayPlan[] = [];
      if (groupIds.length) {
        const { data } = await supabase
          .from('plans')
          .select('id,name,start_time,end_time,group:groups(name),instances:plan_instances(id,occurs_on)')
          .in('group_id', groupIds);
        plans = (data ?? []).flatMap((plan: any) => (plan.instances ?? []).map((instance: any) => ({
          id: plan.id,
          instanceId: instance.id,
          occursOn: instance.occurs_on,
          name: plan.name,
          groupName: plan.group?.name ?? null,
          startTime: plan.start_time,
          endTime: plan.end_time,
        })));
      }

      if (!active) return;
      setState({
        todos: (todoResult.data ?? []) as ScheduleTodo[],
        blocks: (blockResult.data ?? []) as ScheduleBlock[],
        events: (eventResult.data?.events ?? []) as ProviderEvent[],
        plans,
      });
      if (todoResult.error || blockResult.error || eventResult.error) setError('Some schedule data could not load.');
    })();
    return () => { active = false; };
  }, []);

  const selectedDateObj = useMemo(() => parseDateKey(selectedDate), [selectedDate]);
  const weekStart = useMemo(() => mondayOfWeek(selectedDateObj), [selectedDateObj]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  const allDayItems = useMemo(() => {
    if (!state) return [];
    return state.events.filter((event) => event.isAllDay && eventDateKey(event) === selectedDate);
  }, [state, selectedDate]);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (!state) return [];
    const items: TimelineItem[] = [];

    for (const todo of state.todos) {
      if (todo.scheduled_on !== selectedDate || !todo.scheduled_start) continue;
      const startMinute = timeToMinutes(todo.scheduled_start);
      const duration = todo.estimated_minutes ?? DEFAULT_ESTIMATE;
      items.push({
        id: `todo:${todo.id}`,
        title: todo.title,
        source: 'todo',
        startMinute,
        endMinute: startMinute + duration,
        detail: `To-Do · ${duration} min`,
        todo,
      });
    }

    for (const block of state.blocks) {
      if (block.occurs_on !== selectedDate) continue;
      items.push({
        id: `manual:${block.id}`,
        title: block.title,
        source: 'manual',
        startMinute: timeToMinutes(block.start_time),
        endMinute: timeToMinutes(block.end_time),
        detail: block.kind === 'personal' ? 'Personal block' : `${capitalize(block.kind)} block`,
        block,
      });
    }

    for (const plan of state.plans) {
      if (plan.occursOn !== selectedDate || !plan.startTime) continue;
      const startMinute = timeToMinutes(plan.startTime);
      const endMinute = plan.endTime ? timeToMinutes(plan.endTime) : startMinute + 60;
      items.push({
        id: `planner:${plan.instanceId}`,
        title: plan.name,
        source: 'planner',
        startMinute,
        endMinute,
        detail: plan.groupName ? `Planner · ${plan.groupName}` : 'Relay Planner',
        href: `/planner/view/?id=${encodeURIComponent(plan.id)}`,
      });
    }

    for (const event of state.events) {
      if (event.isAllDay || eventDateKey(event) !== selectedDate) continue;
      const start = new Date(event.start);
      if (Number.isNaN(start.getTime())) continue;
      const end = event.end ? new Date(event.end) : null;
      const startMinute = start.getHours() * 60 + start.getMinutes();
      const endMinute = end && !Number.isNaN(end.getTime()) ? end.getHours() * 60 + end.getMinutes() : startMinute + 60;
      items.push({
        id: `calendar:${event.id}`,
        title: event.summary || 'Calendar event',
        source: 'calendar',
        startMinute,
        endMinute: endMinute > startMinute ? endMinute : startMinute + 30,
        detail: event.calendarName ? `${event.calendarName} · ${event.accountEmail ?? ''}` : event.accountEmail ?? 'Calendar',
        href: event.htmlLink,
      });
    }

    return items.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);
  }, [state, selectedDate]);

  const unscheduledTodos = useMemo(() => {
    if (!state) return [];
    return state.todos.filter((todo) => !todo.scheduled_on).sort((a, b) => a.due_on.localeCompare(b.due_on));
  }, [state]);

  const isToday = selectedDate === localDateKey(now);
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  const timelineHeight = (END_MINUTE - START_MINUTE) * PX_PER_MINUTE;

  function changeDay(offset: number) {
    setSelectedDate(localDateKey(addDays(selectedDateObj, offset)));
  }

  function onTimelineClick(event: React.MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-schedule-block]')) return;
    const minute = minuteFromPointer(event.clientY, event.currentTarget.getBoundingClientRect());
    setBlockStart(minutesToTime(minute));
  }

  async function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!state) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const minute = minuteFromPointer(event.clientY, rect);
    const todoId = event.dataTransfer.getData('application/x-relay-todo');
    const blockId = event.dataTransfer.getData('application/x-relay-schedule-block');

    if (todoId) {
      const todo = state.todos.find((item) => item.id === todoId);
      if (!todo) return;
      const duration = todo.estimated_minutes ?? DEFAULT_ESTIMATE;
      setBusy(`todo:${todo.id}`);
      const result = await scheduleTodo(todo.id, selectedDate, minutesToTime(minute), duration);
      setBusy(null);
      if (!result.ok) return setError(result.error);
      setState((current) => current ? { ...current, todos: current.todos.map((item) => item.id === todo.id ? result.data : item) } : current);
      return;
    }

    if (blockId) {
      const block = state.blocks.find((item) => item.id === blockId);
      if (!block) return;
      const duration = timeToMinutes(block.end_time) - timeToMinutes(block.start_time);
      const endMinute = Math.min(END_MINUTE, minute + duration);
      setBusy(`manual:${block.id}`);
      const result = await moveScheduleBlock(block.id, selectedDate, minutesToTime(minute), minutesToTime(endMinute));
      setBusy(null);
      if (!result.ok) return setError(result.error);
      setState((current) => current ? { ...current, blocks: current.blocks.map((item) => item.id === block.id ? result.data : item) } : current);
    }
  }

  async function addBlock(event: FormEvent) {
    event.preventDefault();
    const startMinute = timeToMinutes(blockStart);
    const endMinute = startMinute + blockDuration;
    if (endMinute > END_MINUTE) return setError('That block would run past midnight.');
    setBusy('new-block');
    setError(null);
    const result = await createScheduleBlock({
      title: blockTitle,
      occursOn: selectedDate,
      startTime: blockStart,
      endTime: minutesToTime(endMinute),
      kind: blockKind,
    });
    setBusy(null);
    if (!result.ok) return setError(result.error);
    setState((current) => current ? { ...current, blocks: [...current.blocks, result.data] } : current);
    setBlockTitle('');
  }

  async function saveEstimate(todo: ScheduleTodo, value: number) {
    setBusy(`estimate:${todo.id}`);
    const result = await setTodoEstimate(todo.id, value);
    setBusy(null);
    if (!result.ok) return setError(result.error);
    setState((current) => current ? { ...current, todos: current.todos.map((item) => item.id === todo.id ? result.data : item) } : current);
  }

  async function scheduleNext(todo: ScheduleTodo) {
    const duration = todo.estimated_minutes ?? DEFAULT_ESTIMATE;
    const earliest = isToday ? Math.max(START_MINUTE, snap(nowMinute + 15)) : 8 * 60;
    const start = findNextAvailable(earliest, duration, timelineItems);
    setBusy(`todo:${todo.id}`);
    const result = await scheduleTodo(todo.id, selectedDate, minutesToTime(start), duration);
    setBusy(null);
    if (!result.ok) return setError(result.error);
    setState((current) => current ? { ...current, todos: current.todos.map((item) => item.id === todo.id ? result.data : item) } : current);
  }

  async function unscheduleTodo(todo: ScheduleTodo) {
    setBusy(`todo:${todo.id}`);
    const result = await clearTodoSchedule(todo.id);
    setBusy(null);
    if (!result.ok) return setError(result.error);
    setState((current) => current ? { ...current, todos: current.todos.map((item) => item.id === todo.id ? result.data : item) } : current);
  }

  async function removeBlock(block: ScheduleBlock) {
    setBusy(`manual:${block.id}`);
    const result = await deleteScheduleBlock(block.id);
    setBusy(null);
    if (!result.ok) return setError(result.error);
    setState((current) => current ? { ...current, blocks: current.blocks.filter((item) => item.id !== block.id) } : current);
  }

  if (!state) return <PageLoading />;

  return (
    <div className="mx-auto max-w-[96rem] px-4 py-8 md:px-6">
      <PageHeader title="Schedule" subtitle="Turn your calendar, plans, and To-Dos into an actual day." />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => changeDay(-7)} aria-label="Previous week" className="grid h-9 w-9 place-items-center rounded-md text-ink-muted hover:bg-surface"><ChevronLeft size={17} /></button>
          <button type="button" onClick={() => setSelectedDate(localDateKey())} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-surface">Today</button>
          <button type="button" onClick={() => changeDay(7)} aria-label="Next week" className="grid h-9 w-9 place-items-center rounded-md text-ink-muted hover:bg-surface"><ChevronRight size={17} /></button>
        </div>
        <p className="text-sm font-medium text-ink">{selectedDateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="mt-4 grid grid-cols-7 overflow-hidden rounded-xl border border-border bg-surface-raised">
        {weekDays.map((day) => {
          const key = localDateKey(day);
          const selected = key === selectedDate;
          const today = key === localDateKey();
          return (
            <button key={key} type="button" onClick={() => setSelectedDate(key)} className={`min-w-0 border-r border-border px-2 py-3 text-center last:border-r-0 ${selected ? 'bg-ink text-canvas' : 'text-ink hover:bg-surface'}`}>
              <span className={`block text-[10px] font-semibold uppercase tracking-[.12em] ${selected ? 'text-canvas/70' : 'text-ink-faint'}`}>{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
              <span className="mt-1 block text-lg font-semibold">{day.getDate()}</span>
              {today && <span className={`mx-auto mt-1 block h-1 w-1 rounded-full ${selected ? 'bg-canvas' : 'bg-ink'}`} />}
            </button>
          );
        })}
      </div>

      {error && <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-600">{error}<button type="button" onClick={() => setError(null)} className="ml-3 font-semibold">Dismiss</button></div>}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-canvas">
          {allDayItems.length > 0 && (
            <div className="border-b border-border bg-surface/50 px-4 py-3">
              <div className="flex items-start gap-3"><span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">All day</span><div className="flex min-w-0 flex-1 flex-wrap gap-2">{allDayItems.map((event) => <span key={event.id} className="rounded-md border border-border bg-surface-raised px-2.5 py-1.5 text-xs text-ink">{event.summary || 'Calendar event'}</span>)}</div></div>
            </div>
          )}

          <div className="relative overflow-x-hidden" style={{ height: timelineHeight }} onClick={onTimelineClick} onDragOver={(event) => event.preventDefault()} onDrop={onDrop}>
            {Array.from({ length: 20 }, (_, index) => {
              const minute = START_MINUTE + index * 60;
              const top = (minute - START_MINUTE) * PX_PER_MINUTE;
              return <div key={minute} className="absolute inset-x-0 border-t border-border/70" style={{ top }}><span className="absolute left-3 -translate-y-1/2 bg-canvas pr-2 text-[11px] font-medium text-ink-faint">{formatMinute(minute)}</span></div>;
            })}

            {isToday && nowMinute >= START_MINUTE && nowMinute <= END_MINUTE && (
              <div className="pointer-events-none absolute left-16 right-0 z-20 border-t border-red-500" style={{ top: (nowMinute - START_MINUTE) * PX_PER_MINUTE }}>
                <span className="absolute -left-1 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500" />
                <span className="absolute left-2 -translate-y-[120%] rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Now</span>
              </div>
            )}

            <div className="absolute bottom-0 left-16 top-0 right-0">
              {timelineItems.map((item, index) => {
                const start = Math.max(START_MINUTE, item.startMinute);
                const end = Math.min(END_MINUTE, Math.max(item.endMinute, start + 15));
                if (end <= START_MINUTE || start >= END_MINUTE) return null;
                const top = (start - START_MINUTE) * PX_PER_MINUTE;
                const height = Math.max(28, (end - start) * PX_PER_MINUTE - 3);
                const editable = item.source === 'todo' || item.source === 'manual';
                return (
                  <article
                    key={item.id}
                    data-schedule-block
                    draggable={editable}
                    onDragStart={(event) => {
                      if (item.todo) event.dataTransfer.setData('application/x-relay-todo', item.todo.id);
                      if (item.block) event.dataTransfer.setData('application/x-relay-schedule-block', item.block.id);
                      event.dataTransfer.effectAllowed = 'move';
                    }}
                    className={`absolute left-2 right-3 overflow-hidden rounded-lg border px-3 py-2 shadow-sm ${sourceClasses(item.source)} ${busy === item.id ? 'opacity-50' : ''}`}
                    style={{ top, height, zIndex: 4 + (index % 3) }}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      {editable ? <GripVertical size={14} className="mt-0.5 shrink-0 opacity-50" /> : <Lock size={12} className="mt-1 shrink-0 opacity-50" />}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{item.title}</p>
                        {height >= 44 && <p className="mt-0.5 truncate text-[11px] opacity-70">{formatMinute(item.startMinute)}–{formatMinute(item.endMinute)} · {item.detail}</p>}
                      </div>
                      {item.todo && <button type="button" onClick={(event) => { event.stopPropagation(); void unscheduleTodo(item.todo!); }} className="grid h-6 w-6 shrink-0 place-items-center rounded opacity-60 hover:bg-black/5 hover:opacity-100" aria-label={`Unschedule ${item.title}`}><X size={13} /></button>}
                      {item.block && <button type="button" onClick={(event) => { event.stopPropagation(); void removeBlock(item.block!); }} className="grid h-6 w-6 shrink-0 place-items-center rounded opacity-60 hover:bg-red-500/10 hover:text-red-600 hover:opacity-100" aria-label={`Delete ${item.title}`}><Trash2 size={13} /></button>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-4">
          <section className="rounded-xl border border-border bg-surface-raised p-4">
            <div className="flex items-center gap-2"><Plus size={16} className="text-ink-muted" /><h2 className="font-semibold text-ink">Add time block</h2></div>
            <form onSubmit={addBlock} className="mt-4 space-y-3">
              <label className="block"><span className="text-xs font-medium text-ink-muted">What are you doing?</span><input value={blockTitle} onChange={(event) => setBlockTitle(event.target.value)} maxLength={120} placeholder="Dinner, piano, commute…" className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-ink-muted" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block"><span className="text-xs font-medium text-ink-muted">Start</span><input type="time" value={blockStart} onChange={(event) => setBlockStart(event.target.value)} className="mt-1.5 w-full rounded-md border border-border bg-canvas px-2 py-2.5 text-sm text-ink" /></label>
                <label className="block"><span className="text-xs font-medium text-ink-muted">Duration</span><select value={blockDuration} onChange={(event) => setBlockDuration(Number(event.target.value))} className="mt-1.5 w-full rounded-md border border-border bg-canvas px-2 py-2.5 text-sm text-ink">{DURATION_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{formatDuration(minutes)}</option>)}</select></label>
              </div>
              <label className="block"><span className="text-xs font-medium text-ink-muted">Type</span><select value={blockKind} onChange={(event) => setBlockKind(event.target.value as ScheduleBlockKind)} className="mt-1.5 w-full rounded-md border border-border bg-canvas px-2 py-2.5 text-sm text-ink">{KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}</select></label>
              <button type="submit" disabled={busy === 'new-block' || !blockTitle.trim()} className="w-full rounded-md bg-ink px-3 py-2.5 text-sm font-semibold text-canvas disabled:opacity-40">{busy === 'new-block' ? 'Adding…' : `Add to ${formatSelectedDay(selectedDate)}`}</button>
            </form>
          </section>

          <section className="rounded-xl border border-border bg-surface-raised p-4">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><ListTodo size={16} className="text-ink-muted" /><h2 className="font-semibold text-ink">Unscheduled</h2></div><span className="text-xs text-ink-faint">{unscheduledTodos.length}</span></div>
            <p className="mt-2 text-xs leading-5 text-ink-faint">Drag a task onto the timeline, or let Relay place it in the next open spot.</p>
            {unscheduledTodos.length ? <div className="mt-3 max-h-[34rem] space-y-2 overflow-y-auto pr-1">{unscheduledTodos.slice(0, 40).map((todo) => (
              <article key={todo.id} draggable onDragStart={(event) => { event.dataTransfer.setData('application/x-relay-todo', todo.id); event.dataTransfer.effectAllowed = 'move'; }} className="rounded-lg border border-border bg-canvas p-3">
                <div className="flex items-start gap-2"><GripVertical size={14} className="mt-0.5 shrink-0 text-ink-faint" /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-ink">{todo.title}</p><p className="mt-1 text-[11px] text-ink-faint">Due {formatDue(todo.due_on)}</p></div></div>
                <div className="mt-3 flex items-center gap-2"><select value={todo.estimated_minutes ?? DEFAULT_ESTIMATE} disabled={busy === `estimate:${todo.id}`} onChange={(event) => void saveEstimate(todo, Number(event.target.value))} className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-ink">{DURATION_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{formatDuration(minutes)}</option>)}</select><button type="button" disabled={busy === `todo:${todo.id}`} onClick={() => void scheduleNext(todo)} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-ink hover:bg-surface disabled:opacity-40">Next spot</button></div>
              </article>
            ))}</div> : <div className="mt-3 rounded-lg border border-dashed border-border px-3 py-5 text-center text-sm text-ink-faint">Everything has a place.</div>}
          </section>

          <section className="rounded-xl border border-border bg-surface p-4 text-xs leading-5 text-ink-muted">
            <div className="flex items-center gap-2 font-semibold text-ink"><Clock3 size={15} /> How Schedule works</div>
            <p className="mt-2">Calendar and Planner blocks are locked. Personal blocks and To-Dos are yours to move. To-Dos keep their due date even when you schedule when to work on them.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function sourceClasses(source: TimelineItem['source']) {
  if (source === 'todo') return 'border-cyan-500/25 bg-cyan-500/10 text-ink';
  if (source === 'manual') return 'border-violet-500/25 bg-violet-500/10 text-ink';
  if (source === 'planner') return 'border-border bg-surface-raised text-ink';
  return 'border-blue-500/25 bg-blue-500/10 text-ink';
}

function parseDateKey(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1, 12);
}

function eventDateKey(event: ProviderEvent) {
  if (event.isAllDay) return event.start.slice(0, 10);
  const date = new Date(event.start);
  return Number.isNaN(date.getTime()) ? event.start.slice(0, 10) : localDateKey(date);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function minutesToTime(total: number) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatMinute(total: number) {
  const safe = ((Math.round(total) % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatDue(key: string) {
  const date = parseDateKey(key);
  const today = localDateKey();
  if (key === today) return 'today';
  if (key === localDateKey(addDays(new Date(), 1))) return 'tomorrow';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatSelectedDay(key: string) {
  if (key === localDateKey()) return 'today';
  return parseDateKey(key).toLocaleDateString(undefined, { weekday: 'short' });
}

function snap(minute: number) {
  return Math.round(minute / SNAP_MINUTES) * SNAP_MINUTES;
}

function minuteFromPointer(clientY: number, rect: DOMRect) {
  const raw = START_MINUTE + (clientY - rect.top) / PX_PER_MINUTE;
  return Math.max(START_MINUTE, Math.min(END_MINUTE - SNAP_MINUTES, snap(raw)));
}

function findNextAvailable(earliest: number, duration: number, items: TimelineItem[]) {
  let candidate = Math.max(START_MINUTE, snap(earliest));
  const busy = items.map((item) => [item.startMinute, item.endMinute] as const).sort((a, b) => a[0] - b[0]);
  while (candidate + duration <= END_MINUTE) {
    const collision = busy.find(([start, end]) => candidate < end && candidate + duration > start);
    if (!collision) return candidate;
    candidate = snap(collision[1]);
  }
  return Math.max(START_MINUTE, END_MINUTE - duration);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
