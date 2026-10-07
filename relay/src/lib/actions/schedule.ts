import { isValidDateKey } from '@/lib/date';
import { createClient } from '@/lib/supabase/client';
import type { Todo } from '@/lib/types/database';

export type ScheduleTodo = Todo & {
  estimated_minutes: number | null;
  scheduled_on: string | null;
  scheduled_start: string | null;
};

export type ScheduleBlockKind = 'personal' | 'focus' | 'break' | 'routine';

export type ScheduleBlock = {
  id: string;
  user_id: string;
  title: string;
  occurs_on: string;
  start_time: string;
  end_time: string;
  kind: ScheduleBlockKind;
  created_at: string;
  updated_at: string;
};

type TodoResult = { ok: true; data: ScheduleTodo } | { ok: false; error: string };
type BlockResult = { ok: true; data: ScheduleBlock } | { ok: false; error: string };
type EmptyResult = { ok: true } | { ok: false; error: string };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

function validMinutes(value: number) {
  return Number.isInteger(value) && value >= 5 && value <= 720;
}

export async function scheduleTodo(
  id: string,
  scheduledOn: string,
  scheduledStart: string,
  estimatedMinutes: number,
): Promise<TodoResult> {
  try {
  if (!isValidDateKey(scheduledOn) || !TIME_RE.test(scheduledStart)) return { ok: false, error: 'Choose a valid time.' };
  if (!validMinutes(estimatedMinutes)) return { ok: false, error: 'Choose a duration between 5 minutes and 12 hours.' };

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase
    .from('todos')
    .update({ scheduled_on: scheduledOn, scheduled_start: scheduledStart.slice(0, 5), estimated_minutes: estimatedMinutes })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  return error || !data ? { ok: false, error: 'That task could not be scheduled.' } : { ok: true, data };

  } catch { return { ok: false, error: 'The request was not confirmed. Check your connection and retry.' }; }
}

export async function setTodoEstimate(id: string, estimatedMinutes: number): Promise<TodoResult> {
  try {
  if (!validMinutes(estimatedMinutes)) return { ok: false, error: 'Choose a duration between 5 minutes and 12 hours.' };
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { data, error } = await supabase
    .from('todos')
    .update({ estimated_minutes: estimatedMinutes })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  return error || !data ? { ok: false, error: 'That estimate could not be saved.' } : { ok: true, data };

  } catch { return { ok: false, error: 'The request was not confirmed. Check your connection and retry.' }; }
}

export async function clearTodoSchedule(id: string): Promise<TodoResult> {
  try {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { data, error } = await supabase
    .from('todos')
    .update({ scheduled_on: null, scheduled_start: null })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  return error || !data ? { ok: false, error: 'That task could not be unscheduled.' } : { ok: true, data };

  } catch { return { ok: false, error: 'The request was not confirmed. Check your connection and retry.' }; }
}

export async function createScheduleBlock(input: {
  title: string;
  occursOn: string;
  startTime: string;
  endTime: string;
  kind?: ScheduleBlockKind;
}): Promise<BlockResult> {
  try {
  const title = input.title.trim();
  if (!title || title.length > 120) return { ok: false, error: 'Give the block a short name.' };
  if (!isValidDateKey(input.occursOn) || !TIME_RE.test(input.startTime) || !TIME_RE.test(input.endTime)) return { ok: false, error: 'Choose a valid day and time.' };
  if (input.endTime.slice(0, 5) <= input.startTime.slice(0, 5)) return { ok: false, error: 'End time must be after start time.' };

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { data, error } = await supabase
    .from('schedule_blocks')
    .insert({
      user_id: user.id,
      title,
      occurs_on: input.occursOn,
      start_time: input.startTime.slice(0, 5),
      end_time: input.endTime.slice(0, 5),
      kind: input.kind ?? 'personal',
    })
    .select('*')
    .single();
  return error || !data ? { ok: false, error: 'That time block could not be created.' } : { ok: true, data };

  } catch { return { ok: false, error: 'The request was not confirmed. Check your connection and retry.' }; }
}

export async function moveScheduleBlock(id: string, occursOn: string, startTime: string, endTime: string): Promise<BlockResult> {
  try {
  if (!isValidDateKey(occursOn) || !TIME_RE.test(startTime) || !TIME_RE.test(endTime) || endTime.slice(0, 5) <= startTime.slice(0, 5)) return { ok: false, error: 'Choose a valid time.' };
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { data, error } = await supabase
    .from('schedule_blocks')
    .update({ occurs_on: occursOn, start_time: startTime.slice(0, 5), end_time: endTime.slice(0, 5), updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();
  return error || !data ? { ok: false, error: 'That time block could not be moved.' } : { ok: true, data };

  } catch { return { ok: false, error: 'The request was not confirmed. Check your connection and retry.' }; }
}

export async function deleteScheduleBlock(id: string): Promise<EmptyResult> {
  try {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { error } = await supabase.from('schedule_blocks').delete().eq('id', id).eq('user_id', user.id);
  return error ? { ok: false, error: 'That time block could not be removed.' } : { ok: true };

  } catch { return { ok: false, error: 'The request was not confirmed. Check your connection and retry.' }; }
}

