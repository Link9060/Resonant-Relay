'use client';

import { createTodo, deleteTodo, setTodoCompleted } from '@/lib/actions/todos';
import { addDays, localDateKey, mondayOfWeek } from '@/lib/date';
import { createClient } from '@/lib/supabase/client';
import type { Todo } from '@/lib/types/database';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

export function WeeklyTodoList() {
  const todayKey = localDateKey();
  const [weekStart, setWeekStart] = useState(() => mondayOfWeek(new Date()));
  const [todos, setTodos] = useState<Todo[]>([]);
  const [openDays, setOpenDays] = useState<Set<string>>(() => new Set([todayKey]));
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [loadedRange, setLoadedRange] = useState('');
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const startKey = localDateKey(days[0]);
  const endKey = localDateKey(days[6]);
  const rangeKey = `${startKey}:${endKey}`;
  const loading = loadedRange !== rangeKey;

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data, error: loadError } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_on', startKey)
        .lte('due_on', endKey)
        .order('completed')
        .order('position')
        .order('created_at');
      if (!active) return;
      setTodos(data ?? []);
      setError(loadError ? 'Your tasks could not load.' : null);
      setLoadedRange(`${startKey}:${endKey}`);
    })();
    return () => { active = false; };
  }, [startKey, endKey]);

  function toggleDay(key: string) {
    setOpenDays((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function addTask(event: FormEvent, dayKey: string) {
    event.preventDefault();
    const title = drafts[dayKey] ?? '';
    setAddingDay(dayKey);
    setError(null);
    const result = await createTodo(title, dayKey);
    setAddingDay(null);
    if (!result.ok) { setError(result.error); return; }
    setTodos((current) => [...current, result.data]);
    setDrafts((current) => ({ ...current, [dayKey]: '' }));
  }

  async function toggleTask(todo: Todo) {
    setBusyId(todo.id);
    setError(null);
    const result = await setTodoCompleted(todo.id, !todo.completed);
    setBusyId(null);
    if (!result.ok) { setError(result.error); return; }
    setTodos((current) => current.map((item) => item.id === todo.id ? result.data : item));
  }

  async function removeTask(todo: Todo) {
    setBusyId(todo.id);
    setError(null);
    const result = await deleteTodo(todo.id);
    setBusyId(null);
    if (!result.ok) { setError(result.error); return; }
    setTodos((current) => current.filter((item) => item.id !== todo.id));
  }

  const weekLabel = `${days[0]!.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${days[6]!.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setWeekStart(mondayOfWeek(new Date()))} className="rounded-md border border-border px-3 py-2 text-sm text-ink transition-colors hover:bg-surface">Today</button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setWeekStart((current) => addDays(current, -7))} aria-label="Previous week" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface"><ChevronLeft size={18} /></button>
          <p className="min-w-44 text-center text-sm font-medium text-ink">{weekLabel}</p>
          <button type="button" onClick={() => setWeekStart((current) => addDays(current, 7))} aria-label="Next week" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted hover:bg-surface"><ChevronRight size={18} /></button>
        </div>
      </div>

      {error && <p className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-lg border border-border bg-surface-raised">
        {days.map((day) => {
          const key = localDateKey(day);
          const dayTodos = todos.filter((todo) => todo.due_on === key);
          const remaining = dayTodos.filter((todo) => !todo.completed).length;
          const isOpen = openDays.has(key);
          const isToday = key === todayKey;
          return (
            <section key={key} className="border-b border-border last:border-b-0">
              <button type="button" onClick={() => toggleDay(key)} aria-expanded={isOpen} className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-surface">
                <div className={`flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md ${isToday ? 'bg-ink text-canvas' : 'bg-surface text-ink'}`}>
                  <span className="text-[11px] uppercase leading-none">{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <span className="mt-1 text-base font-semibold leading-none">{day.getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-medium text-ink">{isToday ? 'Today' : day.toLocaleDateString(undefined, { weekday: 'long' })}</h2>
                  <p className="mt-0.5 text-sm text-ink-faint">{loading ? 'Loading…' : dayTodos.length === 0 ? 'Nothing planned' : remaining === 0 ? 'Everything done' : `${remaining} left`}</p>
                </div>
                <ChevronDown size={18} className={`text-ink-faint transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="border-t border-border bg-surface px-4 py-4">
                  {dayTodos.length > 0 && (
                    <ul className="mb-3 space-y-1">
                      {dayTodos.map((todo) => (
                        <li key={todo.id} className="group flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-raised">
                          <button type="button" disabled={busyId === todo.id} onClick={() => toggleTask(todo)} aria-label={todo.completed ? `Mark ${todo.title} incomplete` : `Complete ${todo.title}`} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${todo.completed ? 'border-ink bg-ink text-canvas' : 'border-ink-faint text-transparent'} disabled:opacity-50`}>
                            <Check size={13} strokeWidth={3} />
                          </button>
                          <span className={`min-w-0 flex-1 text-sm ${todo.completed ? 'text-ink-faint line-through' : 'text-ink'}`}>{todo.title}</span>
                          <button type="button" disabled={busyId === todo.id} onClick={() => removeTask(todo)} aria-label={`Delete ${todo.title}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint opacity-70 hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100 disabled:opacity-40"><Trash2 size={15} /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form onSubmit={(event) => addTask(event, key)} className="flex gap-2">
                    <input value={drafts[key] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} maxLength={120} aria-label={`Add task for ${day.toLocaleDateString(undefined, { weekday: 'long' })}`} placeholder="Add a task…" className="min-w-0 flex-1 rounded-md border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted" />
                    <button type="submit" disabled={addingDay === key || !(drafts[key] ?? '').trim()} className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-2 text-sm font-medium text-canvas disabled:opacity-40">
                      {addingDay === key ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}Add
                    </button>
                  </form>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
