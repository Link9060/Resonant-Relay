'use client';

import { sendMessage } from '@/lib/actions/chats';
import { Send } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';

const MAX_MESSAGE_LENGTH = 4000;

export function MessageComposer({ conversationId, onTypingChange }: { conversationId: string; onTypingChange?: (typing: boolean) => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
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
    if (!body || isPending) return;
    if (body.length > MAX_MESSAGE_LENGTH) {
      setError(`Messages must be ${MAX_MESSAGE_LENGTH.toLocaleString()} characters or fewer.`);
      return;
    }
    setValue('');
    setError(null);
    onTypingChange?.(false);

    startTransition(async () => {
      const result = await sendMessage(conversationId, body);
      if (!result.ok) {
        setError(result.error);
        setValue(body);
      }
    });

    inputRef.current?.focus();
  }

  return (
    <div className="border-t border-border px-4 py-3">
      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
      <div className="flex items-center gap-2">
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
          disabled={isPending || !value.trim()}
          aria-label="Send"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-ink text-canvas disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
