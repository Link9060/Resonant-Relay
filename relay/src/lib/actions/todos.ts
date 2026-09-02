import { createClient } from '@/lib/supabase/client';
import type { Todo } from '@/lib/types/database';

type TodoResult = { ok: true; data: Todo } | { ok: false; error: string };
type EmptyResult = { ok: true } | { ok: false; error: string };

export async function createTodo(title: string, dueOn: string): Promise<TodoResult> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return { ok: false, error: 'Give the task a name.' };
  if (cleanTitle.length > 120) return { ok: false, error: 'Tasks can be up to 120 characters.' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) return { ok: false, error: 'Choose a valid day.' };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase
    .from('todos')
    .insert({ user_id: user.id, title: cleanTitle, due_on: dueOn })
    .select('*')
    .single();

  return error || !data
    ? { ok: false, error: 'That task could not be added.' }
    : { ok: true, data };
}

export async function setTodoCompleted(id: string, completed: boolean): Promise<TodoResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data, error } = await supabase
    .from('todos')
    .update({ completed })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  return error || !data
    ? { ok: false, error: 'That task could not be updated.' }
    : { ok: true, data };
}

export async function deleteTodo(id: string): Promise<EmptyResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { error } = await supabase.from('todos').delete().eq('id', id).eq('user_id', user.id);
  return error ? { ok: false, error: 'That task could not be removed.' } : { ok: true };
}
