'use client';

import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { Brain, CheckCircle2, Clock3, Coffee, MessageCircle, Pause, Play, RotateCcw, ShieldCheck, Sparkles, Square, TimerReset } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type FocusTodo = {
  id: string;
  title: string;
  due_on: string;
  completed: boolean;
};

type FocusSession = {
  id: string;
  todo_id: string | null;
  task_title: string | null;
  mode: 'focus' | 'break';
  planned_minutes: number;
  elapsed_seconds: number;
  completed: boolean;
  started_at: string;
  ended_at: string;
};

const DEFAULT_FOCUS_MINUTES = 45;
const SCRATCH_KEY = 'relay-focus-scratch';
const QUIET_KEY = 'relay-focus-quiet';
const ACTIVE_QUIET_KEY = 'relay-focus-dnd-active';
const QUIET_EVENT = 'relay-focus-dnd-change';

export default function FocusPage() {
  const [todos, setTodos] = useState<FocusTodo[]>([]);
  const [history, setHistory] = useState<FocusSession[]>([]);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [plannedMinutes, setPlannedMinutes] = useState(DEFAULT_FOCUS_MINUTES);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_FOCUS_MINUTES * 60);
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [scratch, setScratch] = useState('');
  const [quietMode, setQuietMode] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const finishingRef = useRef(false);

  const selectedTodo = useMemo(
    () => todos.find((todo) => todo.id === selectedTodoId) ?? null,
    [selectedTodoId, todos],
  );

  useEffect(() => {
    try {
      setScratch(window.localStorage.getItem(SCRATCH_KEY) ?? '');
      setQuietMode(window.localStorage.getItem(QUIET_KEY) !== '0');
    } catch {
      // Local storage can be unavailable in strict/private browser contexts.
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const [todoResult, historyResult] = await Promise.all([
        supabase
          .from('todos')
          .select('id,title,due_on,completed')
          .eq('user_id', user.id)
          .eq('completed', false)
          .order('due_on', { ascending: true })
          .limit(30),
        supabase
          .from('focus_sessions')
          .select('id,todo_id,task_title,mode,planned_minutes,elapsed_seconds,completed,started_at,ended_at')
          .eq('user_id', user.id)
          .gte('started_at', weekAgo.toISOString())
          .order('started_at', { ascending: false })
          .limit(100),
      ]);

      if (!active) return;
      setTodos(todoResult.data ?? []);
      setHistory(historyResult.data ?? []);
      setLoadError(todoResult.error ? 'Relay could not load your task queue.' : null);
      setHistoryError(historyResult.error ? 'Focus history will appear after the 1.0.7 database update is applied.' : null);
    })();

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (running && secondsLeft === 0) void finishSession(true);
  }, [running, secondsLeft]);

  useEffect(() => {
    const active = running && quietMode;
    try {
      window.localStorage.setItem(QUIET_KEY, quietMode ? '1' : '0');
      if (active) window.localStorage.setItem(ACTIVE_QUIET_KEY, '1');
      else window.localStorage.removeItem(ACTIVE_QUIET_KEY);
      window.dispatchEvent(new CustomEvent(QUIET_EVENT, { detail: { active } }));
    } catch {
      // Quiet mode still works visually even if storage is unavailable.
    }
    return () => {
      try {
        window.localStorage.removeItem(ACTIVE_QUIET_KEY);
        window.dispatchEvent(new CustomEvent(QUIET_EVENT, { detail: { active: false } }));
      } catch {
        // Ignore storage cleanup failures.
      }
    };
  }, [quietMode, running]);

  function adjustMinutes(delta: number) {
    if (running || startedAt) return;
    const next = Math.min(480, Math.max(5, plannedMinutes + delta));
    setPlannedMinutes(next);
    setSecondsLeft(next * 60);
  }

  function chooseMode(nextMode: 'focus' | 'break', minutes: number) {
    if (running) return;
    setMode(nextMode);
    setPlannedMinutes(minutes);
    setSecondsLeft(minutes * 60);
    setStartedAt(null);
  }

  function toggleTimer() {
    if (secondsLeft <= 0) return;
    if (!startedAt) setStartedAt(new Date());
    setRunning((current) => !current);
  }

  function resetTimer() {
    setRunning(false);
    setStartedAt(null);
    setSecondsLeft(plannedMinutes * 60);
  }

  async function finishSession(completed: boolean) {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setRunning(false);

    const totalSeconds = plannedMinutes * 60;
    const elapsedSeconds = Math.max(0, totalSeconds - secondsLeft);
    const sessionStartedAt = startedAt ?? new Date(Date.now() - elapsedSeconds * 1000);

    if (elapsedSeconds > 0) {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const payload = {
          user_id: user.id,
          todo_id: mode === 'focus' ? selectedTodo?.id ?? null : null,
          task_title: mode === 'focus' ? selectedTodo?.title ?? null : 'Break',
          mode,
          planned_minutes: plannedMinutes,
          elapsed_seconds: elapsedSeconds,
          completed,
          started_at: sessionStartedAt.toISOString(),
          ended_at: new Date().toISOString(),
        };
        const { data, error } = await supabase
          .from('focus_sessions')
          .insert(payload)
          .select('id,todo_id,task_title,mode,planned_minutes,elapsed_seconds,completed,started_at,ended_at')
          .single();
        if (data) setHistory((current) => [data, ...current].slice(0, 100));
        if (error) setHistoryError('This session could not be saved yet. Your timer still finished normally.');
      }
    }

    setStartedAt(null);
    setSecondsLeft(plannedMinutes * 60);
    finishingRef.current = false;
  }

  function updateScratch(value: string) {
    setScratch(value);
    try { window.localStorage.setItem(SCRATCH_KEY, value); } catch { /* ignore */ }
  }

  const todayKey = localDateKey(new Date());
  const todayFocusSeconds = history
    .filter((session) => session.mode === 'focus' && localDateKey(new Date(session.started_at)) === todayKey)
    .reduce((sum, session) => sum + session.elapsed_seconds, 0);
  const weekFocusSeconds = history
    .filter((session) => session.mode === 'focus')
    .reduce((sum, session) => sum + session.elapsed_seconds, 0);
  const progress = plannedMinutes > 0 ? 1 - secondsLeft / (plannedMinutes * 60) : 0;

  return (
    <div className="mx-auto w-full max-w-[92rem] px-4 py-8 md:px-6">
      <PageHeader title="Focus" subtitle="Choose the work, set the time, and keep everything else out of the way." />

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(15rem,0.78fr)_minmax(28rem,1.65fr)_minmax(18rem,0.9fr)]">
        <aside className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Task queue</p>
              <h2 className="mt-1 text-sm font-semibold text-ink">What are you working on?</h2>
            </div>
            <CheckCircle2 size={18} className="text-ink-faint" />
          </div>

          {loadError && <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">{loadError}</p>}

          <div className="mt-4 space-y-1.5">
            <button
              type="button"
              onClick={() => setSelectedTodoId(null)}
              className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${selectedTodoId === null ? 'border-ink/25 bg-surface-raised' : 'border-transparent hover:bg-surface-raised'}`}
            >
              <span className="block text-sm font-medium text-ink">Open focus</span>
              <span className="mt-0.5 block text-[11px] text-ink-faint">No task attached</span>
            </button>
            {todos.map((todo) => (
              <button
                key={todo.id}
                type="button"
                onClick={() => setSelectedTodoId(todo.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${selectedTodoId === todo.id ? 'border-ink/25 bg-surface-raised' : 'border-transparent hover:bg-surface-raised'}`}
              >
                <span className="block truncate text-sm font-medium text-ink">{todo.title}</span>
                <span className="mt-0.5 block text-[11px] text-ink-faint">{todo.due_on === todayKey ? 'Due today' : `Due ${formatTaskDate(todo.due_on)}`}</span>
              </button>
            ))}
            {todos.length === 0 && !loadError && (
              <p className="rounded-xl border border-dashed border-border px-3 py-7 text-center text-xs leading-5 text-ink-faint">Nothing is waiting in To Do. You can still run an open Focus session.</p>
            )}
          </div>
        </aside>

        <main className="relative overflow-hidden rounded-3xl border border-border bg-surface px-5 py-8 text-center sm:px-8 sm:py-10">
          <div className="pointer-events-none absolute inset-x-[12%] top-12 h-40 rounded-full bg-ink/[0.025] blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-canvas/70 px-3 py-1.5 text-[11px] font-medium text-ink-muted">
              {mode === 'focus' ? <Brain size={13} /> : <Coffee size={13} />}
              {mode === 'focus' ? 'Focus session' : 'Break'}
            </div>

            <p className="mt-5 min-h-6 truncate text-sm text-ink-muted">
              {mode === 'break' ? 'Step away for a minute.' : selectedTodo ? selectedTodo.title : 'Open focus session'}
            </p>

            <div className="relative mx-auto mt-5 flex h-64 w-64 items-center justify-center rounded-full border border-border bg-canvas shadow-sm sm:h-72 sm:w-72">
              <svg aria-hidden="true" viewBox="0 0 120 120" className="absolute inset-3 -rotate-90">
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-border" />
                <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={339.292} strokeDashoffset={339.292 * (1 - progress)} className="text-ink transition-[stroke-dashoffset] duration-500" />
              </svg>
              <div className="relative">
                <div className="font-display text-6xl font-medium tracking-[-0.055em] text-ink sm:text-7xl">{formatClock(secondsLeft)}</div>
                <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">{running ? 'In session' : startedAt ? 'Paused' : 'Ready'}</div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {[-5, 5, 10, 20, 30, 45, 60].map((delta) => (
                <button key={delta} type="button" disabled={running || Boolean(startedAt)} onClick={() => adjustMinutes(delta)} className="min-h-9 rounded-lg border border-border bg-canvas px-3 text-xs font-medium text-ink-muted hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-35">
                  {delta > 0 ? '+' : ''}{delta === 60 ? '1 hr' : `${delta} min`}
                </button>
              ))}
            </div>

            <div className="mt-5 flex justify-center gap-2">
              <button type="button" onClick={toggleTimer} className="inline-flex min-h-12 min-w-36 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-semibold text-canvas">
                {running ? <Pause size={17} /> : <Play size={17} />}{running ? 'Pause' : startedAt ? 'Resume' : 'Start session'}
              </button>
              {startedAt && (
                <button type="button" onClick={() => void finishSession(false)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-ink-muted hover:bg-surface-raised">
                  <Square size={15} />End
                </button>
              )}
              <button type="button" onClick={resetTimer} aria-label="Reset timer" title="Reset timer" className="flex h-12 w-12 items-center justify-center rounded-xl border border-border text-ink-muted hover:bg-surface-raised">
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Break</span>
                {[5, 10, 15].map((minutes) => (
                  <button key={minutes} type="button" disabled={running} onClick={() => chooseMode('break', minutes)} className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:bg-surface-raised disabled:opacity-35">{minutes} min</button>
                ))}
                <button type="button" disabled={running} onClick={() => chooseMode('focus', DEFAULT_FOCUS_MINUTES)} className="rounded-lg border border-border px-3 py-2 text-xs text-ink-muted hover:bg-surface-raised disabled:opacity-35">Back to Focus</button>
              </div>
            </div>
          </div>
        </main>

        <aside className="flex min-h-[34rem] flex-col rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <MessageCircle size={17} className="text-ink-faint" />
            <div>
              <p className="text-sm font-semibold text-ink">Ask Relay</p>
              <p className="text-[11px] text-ink-faint">Context-aware help while you work</p>
            </div>
          </div>

          <div className="my-auto px-3 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-canvas text-ink-faint"><Sparkles size={20} /></span>
            <p className="mt-4 text-sm font-medium text-ink">Coming in Relay 1.1.1</p>
            <p className="mt-2 text-xs leading-5 text-ink-faint">Ask Relay will eventually understand your current task, notes, files, and Focus session without making you leave this workspace.</p>
          </div>

          <div className="rounded-xl border border-border bg-canvas p-2 opacity-60">
            <textarea disabled rows={3} placeholder="Ask Relay…" className="w-full resize-none bg-transparent px-2 py-2 text-sm text-ink outline-none placeholder:text-ink-faint" />
            <button type="button" disabled className="w-full rounded-lg bg-ink px-3 py-2 text-xs font-medium text-canvas opacity-50">Unavailable until 1.1.1</button>
          </div>
        </aside>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Session tools</p>
              <h2 className="mt-1 text-sm font-semibold text-ink">Quiet mode + scratchpad</h2>
            </div>
            <button type="button" onClick={() => setQuietMode((current) => !current)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${quietMode ? 'border-ink/20 bg-ink text-canvas' : 'border-border text-ink-muted'}`}>
              <ShieldCheck size={14} />{quietMode ? 'Quiet on' : 'Quiet off'}
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-ink-faint">Quiet mode marks active Focus sessions so Relay can reduce in-app attention effects while you work.</p>
          <textarea value={scratch} onChange={(event) => updateScratch(event.target.value)} rows={5} maxLength={3000} placeholder="Quick notes for this work session…" className="mt-4 w-full resize-y rounded-xl border border-border bg-canvas px-3 py-3 text-sm leading-6 text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted" />
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Focus history</p>
              <h2 className="mt-1 text-sm font-semibold text-ink">Your recent sessions</h2>
            </div>
            <div className="flex gap-2">
              <StatPill label="Today" value={formatDuration(todayFocusSeconds)} />
              <StatPill label="7 days" value={formatDuration(weekFocusSeconds)} />
            </div>
          </div>

          {historyError && <p className="mt-3 rounded-lg border border-border px-3 py-2 text-xs text-ink-faint">{historyError}</p>}
          <div className="mt-4 space-y-2">
            {history.slice(0, 6).map((session) => (
              <div key={session.id} className="flex items-center gap-3 rounded-xl border border-border bg-canvas px-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-ink-muted">{session.mode === 'focus' ? <Clock3 size={16} /> : <Coffee size={16} />}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{session.task_title || (session.mode === 'focus' ? 'Open focus' : 'Break')}</p>
                  <p className="mt-0.5 text-[11px] text-ink-faint">{new Date(session.started_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {formatDuration(session.elapsed_seconds)}</p>
                </div>
                {session.completed && <CheckCircle2 size={15} className="text-ink-faint" />}
              </div>
            ))}
            {history.length === 0 && !historyError && (
              <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-xs text-ink-faint">Finish your first Focus session and it will show up here.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-canvas px-3 py-2 text-right"><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{label}</div><div className="mt-0.5 text-sm font-semibold text-ink">{value}</div></div>;
}

function formatClock(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function formatTaskDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
