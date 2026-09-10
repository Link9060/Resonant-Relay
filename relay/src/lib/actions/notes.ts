import { createClient } from '@/lib/supabase/client';
import type { Note, NoteBlock, NoteBlockType } from '@/lib/types/database';

type NoteResult = { ok: true; data: Note } | { ok: false; error: string };
type EmptyResult = { ok: true } | { ok: false; error: string };

const BLOCK_TYPES = new Set<NoteBlockType>(['paragraph', 'heading', 'bullet', 'todo', 'quote']);

export function newNoteBlock(type: NoteBlockType = 'paragraph'): NoteBlock {
  return { id: crypto.randomUUID(), type, text: '', ...(type === 'todo' ? { checked: false } : {}) };
}

function cleanTitle(value: string) {
  return value.trim() || 'Untitled';
}

function cleanBlocks(value: NoteBlock[]): NoteBlock[] | null {
  if (!Array.isArray(value) || value.length > 200) return null;
  const blocks = value.map((block) => ({
    id: typeof block.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(block.id) ? block.id : crypto.randomUUID(),
    type: BLOCK_TYPES.has(block.type) ? block.type : 'paragraph' as const,
    text: String(block.text ?? '').slice(0, 4000),
    ...(block.type === 'todo' ? { checked: Boolean(block.checked) } : {}),
  }));
  return new TextEncoder().encode(JSON.stringify(blocks)).length <= 240_000 ? blocks : null;
}

export async function createNote(): Promise<NoteResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { data, error } = await supabase.from('notes').insert({
    user_id: user.id,
    title: 'Untitled',
    content: [newNoteBlock()],
  }).select('*').single();
  return error || !data ? { ok: false, error: 'Your note could not be created.' } : { ok: true, data };
}

export async function updateNote(id: string, title: string, content: NoteBlock[], isPinned: boolean): Promise<NoteResult> {
  const nextTitle = cleanTitle(title);
  if (nextTitle.length > 120) return { ok: false, error: 'Note titles can be up to 120 characters.' };
  const nextContent = cleanBlocks(content);
  if (!nextContent) return { ok: false, error: 'This note is too large to save.' };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { data, error } = await supabase.from('notes').update({
    title: nextTitle,
    content: nextContent,
    is_pinned: isPinned,
  }).eq('id', id).eq('user_id', user.id).select('*').single();
  return error || !data ? { ok: false, error: 'Your changes could not be saved.' } : { ok: true, data };
}

export async function deleteNote(id: string): Promise<EmptyResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };
  const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id);
  return error ? { ok: false, error: 'That note could not be deleted.' } : { ok: true };
}
