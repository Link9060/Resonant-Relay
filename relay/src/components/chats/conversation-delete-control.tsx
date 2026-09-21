'use client';

import { deleteConversationForMe } from '@/lib/actions/conversation-delete';
import { appPageUrl } from '@/lib/config';
import { MoreHorizontal, Trash2, X } from 'lucide-react';
import { useState } from 'react';

export function ConversationDeleteControl({ conversationId, title }: { conversationId: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (busy) return;
    if (!window.confirm(`Delete ${title} from your Chats view? Other people will keep their copy.`)) return;
    setBusy(true);
    setError(null);
    const result = await deleteConversationForMe(conversationId);
    if (!result.ok) {
      setBusy(false);
      setError(result.error);
      return;
    }
    window.location.assign(appPageUrl('/chats'));
  }

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-label="Conversation actions" title="Conversation actions" className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface-raised/95 text-ink-muted shadow-sm backdrop-blur hover:bg-surface hover:text-ink">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close conversation actions" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div className="relay-popover absolute bottom-full right-0 z-40 mb-2 w-56 rounded-xl border border-border bg-surface-raised p-2 shadow-xl">
            <div className="flex items-center justify-between gap-2 px-2 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Conversation</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-ink-faint"><X size={13} /></button>
            </div>
            <button type="button" disabled={busy} onClick={() => void remove()} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50">
              <Trash2 size={14} />{busy ? 'Deleting…' : 'Delete conversation'}
            </button>
            <p className="px-3 pb-1 pt-2 text-[10px] leading-4 text-ink-faint">This removes the chat only from your Relay view. Shared history is not destroyed.</p>
            {error && <p className="mt-1 rounded-md bg-red-500/10 px-3 py-2 text-[10px] text-red-600">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
