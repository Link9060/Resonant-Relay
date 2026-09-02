'use client';

import { sendMessage } from '@/lib/actions/chats';
import { Paperclip, Send, X } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';

const MAX_MESSAGE_LENGTH = 4000;

export function MessageComposer({ conversationId, onTypingChange }: { conversationId: string; onTypingChange?: (typing: boolean) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const stopTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSignal = useRef(0);

  useEffect(() => () => {
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    onTypingChange?.(false);
  }, [onTypingChange]);

  function signalTyping(nextValue: string) {
    if (stopTypingTimer.current) clearTimeout(stopTypingTimer.current);
    if (!nextValue.trim()) {
      onTypingChange?.(false);
      return;
    }
    const now = Date.now();
    if (now - lastTypingSignal.current > 1400) {
      onTypingChange?.(true);
      lastTypingSignal.current = now;
    }
    stopTypingTimer.current = setTimeout(() => onTypingChange?.(false), 2200);
  }

  function handleSend() {
    const body = value.trim();
    if ((!body && files.length === 0) || isPending) return;
    if (body.length > MAX_MESSAGE_LENGTH) {
      setError(`Messages must be ${MAX_MESSAGE_LENGTH.toLocaleString()} characters or fewer.`);
      return;
    }
    setValue('');
    const pendingFiles = files;
    setFiles([]);
    setError(null);
    onTypingChange?.(false);

    startTransition(async () => {
      const result = await sendMessage(conversationId, body, pendingFiles);
      if (!result.ok) {
        setError(result.error);
        setValue(body);
        setFiles(pendingFiles);
      }
    });

    inputRef.current?.focus();
  }

  return (
    <div className="border-t border-border px-4 py-3">
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
      {files.length > 0 && <ul className="mb-2 flex flex-wrap gap-2">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex max-w-52 items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-ink"><Paperclip size={13} className="shrink-0" /><span className="truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="text-ink-faint hover:text-ink"><X size={13} /></button></li>)}</ul>}
      <div className="flex items-center gap-2">
        <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border text-ink-muted hover:bg-surface hover:text-ink" aria-label="Attach photos or files">
          <Paperclip size={17} />
          <input type="file" multiple className="sr-only" accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,application/pdf,text/plain,text/csv,application/zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={(event) => { const selected = Array.from(event.target.files ?? []); setError(null); setFiles((current) => [...current, ...selected].slice(0, 5)); event.target.value = ''; }} />
        </label>
        <input
          ref={inputRef}
          value={value}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(e) => { setValue(e.target.value); signalTyping(e.target.value); }}
          onBlur={() => onTypingChange?.(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Message"
          className="flex-1 rounded-md border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus-visible:border-accent"
        />
        <button
          onClick={handleSend}
          disabled={isPending || (!value.trim() && files.length === 0)}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink text-canvas disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
