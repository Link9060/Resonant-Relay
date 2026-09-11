'use client';

import { createNote, deleteNote, newNoteBlock, updateNote } from '@/lib/actions/notes';
import { createClient } from '@/lib/supabase/client';
import type { Note, NoteBlock, NoteBlockType } from '@/lib/types/database';
import { ArrowDown, ArrowUp, Check, CheckSquare, FilePlus2, Heading2, List, Loader2, MessageSquareQuote, Pin, PinOff, Plus, Search, Trash2, Type } from 'lucide-react';
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

const BLOCK_BUTTONS: Array<{ type: NoteBlockType; label: string; icon: typeof Type }> = [
  { type: 'paragraph', label: 'Text', icon: Type },
  { type: 'heading', label: 'Heading', icon: Heading2 },
  { type: 'bullet', label: 'List', icon: List },
  { type: 'todo', label: 'To-do', icon: CheckSquare },
  { type: 'quote', label: 'Quote', icon: MessageSquareQuote },
];

export function NotesWorkspace() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dirtyId, setDirtyId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data, error: loadError } = await supabase.from('notes').select('*').eq('user_id', user.id).order('is_pinned', { ascending: false }).order('updated_at', { ascending: false });
      if (!active) return;
      const loaded = data ?? [];
      setNotes(loaded);
      setSelectedId(loaded[0]?.id ?? null);
      setError(loadError ? 'Your notes could not load.' : null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const selected = notes.find((note) => note.id === selectedId) ?? null;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return notes;
    return notes.filter((note) => `${note.title} ${noteSnippet(note)}`.toLowerCase().includes(needle));
  }, [notes, query]);

  useEffect(() => {
    if (!selected || dirtyId !== selected.id) return;
    const timer = window.setTimeout(() => { void persist(selected); }, 700);
    return () => window.clearTimeout(timer);
  }, [selected, dirtyId]);

  async function persist(note: Note) {
    const result = await updateNote(note.id, note.title, note.content, note.is_pinned);
    if (!result.ok) { setSaveState('error'); setError(result.error); return; }
    setNotes((current) => sortNotes(current.map((item) => item.id === note.id ? result.data : item)));
    setDirtyId((current) => current === note.id ? null : current);
    setSaveState('saved');
  }

  async function addNote() {
    setCreating(true);
    setError(null);
    const result = await createNote();
    setCreating(false);
    if (!result.ok) { setError(result.error); return; }
    setNotes((current) => sortNotes([result.data, ...current]));
    setSelectedId(result.data.id);
    setSaveState('saved');
  }

  function selectNote(id: string) {
    if (selected && dirtyId === selected.id) void persist(selected);
    setSelectedId(id);
    setSaveState('idle');
  }

  function changeSelected(change: (note: Note) => Note) {
    if (!selectedId) return;
    setNotes((current) => current.map((note) => note.id === selectedId ? change(note) : note));
    setDirtyId(selectedId);
    setSaveState('saving');
    setError(null);
  }

  function addBlock(type: NoteBlockType, afterIndex?: number) {
    changeSelected((note) => {
      const content = [...note.content];
      content.splice(afterIndex === undefined ? content.length : afterIndex + 1, 0, newNoteBlock(type));
      return { ...note, content };
    });
  }

  function updateBlock(id: string, change: Partial<NoteBlock>) {
    changeSelected((note) => ({ ...note, content: note.content.map((block) => block.id === id ? { ...block, ...change } : block) }));
  }

  function removeBlock(id: string) {
    changeSelected((note) => {
      const content = note.content.filter((block) => block.id !== id);
      return { ...note, content: content.length ? content : [newNoteBlock()] };
    });
  }

  function moveBlock(index: number, direction: -1 | 1) {
    changeSelected((note) => {
      const destination = index + direction;
      if (destination < 0 || destination >= note.content.length) return note;
      const content = [...note.content];
      const [block] = content.splice(index, 1);
      content.splice(destination, 0, block!);
      return { ...note, content };
    });
  }

  function blockKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, block: NoteBlock, index: number) {
    if (event.key === 'Enter' && !event.shiftKey && event.currentTarget.selectionStart === block.text.length) {
      event.preventDefault();
      addBlock(block.type === 'todo' || block.type === 'bullet' ? block.type : 'paragraph', index);
    } else if (event.key === 'Backspace' && !block.text && selected && selected.content.length > 1) {
      event.preventDefault();
      removeBlock(block.id);
    }
  }

  async function removeSelected() {
    if (!selected || !window.confirm(`Delete “${selected.title || 'Untitled'}”? This cannot be undone.`)) return;
    const result = await deleteNote(selected.id);
    if (!result.ok) { setError(result.error); return; }
    const remaining = notes.filter((note) => note.id !== selected.id);
    setNotes(remaining);
    setSelectedId(remaining[0]?.id ?? null);
    setDirtyId(null);
    setSaveState('idle');
  }

  return (
    <section aria-labelledby="notes-heading">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="notes-heading" className="font-display text-2xl font-medium tracking-tight text-ink">Notes</h1>
          <p className="mt-1 text-sm text-ink-faint">A private space for ideas, class notes, and project details.</p>
        </div>
        <button type="button" onClick={() => void addNote()} disabled={creating} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-ink px-3.5 text-sm font-medium text-canvas disabled:opacity-45">
          {creating ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}New note
        </button>
      </div>

      {error && <p className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="grid min-h-[34rem] overflow-hidden rounded-xl border border-border bg-surface md:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="border-b border-border bg-surface-raised md:border-b-0 md:border-r">
          <label className="relative m-3 block">
            <span className="sr-only">Search notes</span>
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" className="w-full rounded-md border border-border bg-canvas py-2 pl-8 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted" />
          </label>
          <div className="max-h-64 overflow-y-auto border-t border-border md:max-h-[29.5rem]">
            {loading ? <div className="flex items-center justify-center gap-2 py-10 text-sm text-ink-faint"><Loader2 size={15} className="animate-spin" />Loading notes…</div> : filtered.length === 0 ? <p className="px-4 py-10 text-center text-sm text-ink-faint">{notes.length ? 'No notes match.' : 'Create your first note.'}</p> : (
              <ul className="divide-y divide-border">
                {filtered.map((note) => <li key={note.id}><button type="button" onClick={() => selectNote(note.id)} className={`w-full px-3 py-3 text-left transition-colors ${selectedId === note.id ? 'bg-canvas' : 'hover:bg-surface'}`}>
                  <div className="flex items-center gap-1.5"><span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{note.title || 'Untitled'}</span>{note.is_pinned && <Pin size={11} className="shrink-0 text-ink-faint" />}</div>
                  <p className="mt-1 truncate text-xs text-ink-faint">{noteSnippet(note) || 'Empty note'}</p>
                  <p className="mt-1.5 text-[10px] text-ink-faint">{formatUpdated(note.updated_at)}</p>
                </button></li>)}
              </ul>
            )}
          </div>
        </aside>

        {selected ? (
          <div className="flex min-w-0 flex-col bg-canvas">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
              <span className={`inline-flex items-center gap-1.5 text-xs ${saveState === 'error' ? 'text-red-500' : 'text-ink-faint'}`}>
                {saveState === 'saving' && <Loader2 size={12} className="animate-spin" />}
                {saveState === 'saved' && <Check size={12} />}
                {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Not saved' : 'Autosaves'}
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => changeSelected((note) => ({ ...note, is_pinned: !note.is_pinned }))} aria-label={selected.is_pinned ? 'Unpin note' : 'Pin note'} title={selected.is_pinned ? 'Unpin note' : 'Pin note'} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-surface hover:text-ink">{selected.is_pinned ? <PinOff size={15} /> : <Pin size={15} />}</button>
                <button type="button" onClick={() => void removeSelected()} aria-label="Delete note" title="Delete note" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-red-500/10 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
              <input value={selected.title} onChange={(event) => changeSelected((note) => ({ ...note, title: event.target.value.slice(0, 120) }))} maxLength={120} aria-label="Note title" placeholder="Untitled" className="w-full bg-transparent font-display text-2xl font-semibold tracking-tight text-ink outline-none placeholder:text-ink-faint sm:text-3xl" />
              <div className="mt-5 space-y-1">
                {selected.content.map((block, index) => <NoteBlockEditor key={block.id} block={block} index={index} total={selected.content.length} onChange={(change) => updateBlock(block.id, change)} onRemove={() => removeBlock(block.id)} onMove={(direction) => moveBlock(index, direction)} onKeyDown={(event) => blockKeyDown(event, block, index)} />)}
              </div>
              <div className="mt-5 flex flex-wrap gap-1.5 border-t border-border pt-4" aria-label="Add a block">
                {BLOCK_BUTTONS.map(({ type, label, icon: Icon }) => <button key={type} type="button" onClick={() => addBlock(type)} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-raised hover:text-ink"><Icon size={13} />{label}</button>)}
              </div>
              <p className="mt-3 text-[11px] text-ink-faint">Enter adds another block. Shift + Enter starts a new line.</p>
            </div>
          </div>
        ) : (
          <div className="flex min-h-72 items-center justify-center px-6 text-center"><div><Plus size={22} className="mx-auto text-ink-faint" /><p className="mt-3 text-sm font-medium text-ink">No note selected</p><p className="mt-1 text-xs text-ink-faint">Create a note to start writing.</p></div></div>
        )}
      </div>
    </section>
  );
}

function NoteBlockEditor({ block, index, total, onChange, onRemove, onMove, onKeyDown }: { block: NoteBlock; index: number; total: number; onChange: (change: Partial<NoteBlock>) => void; onRemove: () => void; onMove: (direction: -1 | 1) => void; onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void }) {
  const marker = block.type === 'bullet' ? '•' : block.type === 'quote' ? '│' : null;
  return (
    <div className="group flex items-start gap-2 rounded-md px-1 py-1 hover:bg-surface">
      {block.type === 'todo' ? <input type="checkbox" checked={Boolean(block.checked)} onChange={(event) => onChange({ checked: event.target.checked })} aria-label="Complete note item" className="mt-2 h-4 w-4 shrink-0 rounded border-border accent-current" /> : marker ? <span className={`mt-1.5 shrink-0 text-ink-faint ${block.type === 'quote' ? 'font-semibold' : 'text-base'}`}>{marker}</span> : null}
      <textarea
        value={block.text}
        onChange={(event) => onChange({ text: event.target.value })}
        onKeyDown={onKeyDown}
        rows={1}
        maxLength={4000}
        placeholder={block.type === 'heading' ? 'Heading' : block.type === 'todo' ? 'To-do' : block.type === 'quote' ? 'Quote' : block.type === 'bullet' ? 'List item' : 'Start writing…'}
        className={`min-h-9 min-w-0 flex-1 resize-none overflow-hidden bg-transparent px-1 py-1.5 outline-none placeholder:text-ink-faint [field-sizing:content] ${block.type === 'heading' ? 'font-display text-xl font-semibold text-ink' : block.type === 'quote' ? 'italic leading-6 text-ink-muted' : block.type === 'todo' && block.checked ? 'text-ink-faint line-through' : 'text-base leading-6 text-ink'}`}
      />
      <div className="flex shrink-0 items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move block up" className="flex h-7 w-7 items-center justify-center rounded text-ink-faint hover:bg-canvas hover:text-ink disabled:invisible"><ArrowUp size={12} /></button>
        <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Move block down" className="flex h-7 w-7 items-center justify-center rounded text-ink-faint hover:bg-canvas hover:text-ink disabled:invisible"><ArrowDown size={12} /></button>
        <button type="button" onClick={onRemove} aria-label="Delete block" className="flex h-7 w-7 items-center justify-center rounded text-ink-faint hover:bg-red-500/10 hover:text-red-600"><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

function sortNotes(notes: Note[]) {
  return [...notes].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

function noteSnippet(note: Note) {
  return note.content.map((block) => block.text.trim()).filter(Boolean).join(' · ');
}

function formatUpdated(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? `Today at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
