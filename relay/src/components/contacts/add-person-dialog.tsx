'use client';

import { lookupRelayNumber, sendConnectionRequest } from '@/lib/actions/contacts';
import { formatRelayNumber } from '@/lib/utils';
import { Loader2, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Preview = { id: string; display_name: string; avatar_url: string | null; school: string | null };
type Step = 'input' | 'preview' | 'sent';

export function AddPersonDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('input');
  const [relayNumber, setRelayNumber] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reset = useCallback(() => {
    setStep('input');
    setRelayNumber('');
    setPreview(null);
    setError(null);
    setLoading(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, open]);

  async function handleLookup() {
    setError(null);
    setLoading(true);
    const result = await lookupRelayNumber(relayNumber);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPreview(result.data);
    setStep('preview');
  }

  async function handleSend() {
    if (!preview) return;
    setLoading(true);
    const result = await sendConnectionRequest(preview.id);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStep('sent');
  }

  return (
    <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-canvas transition-all hover:opacity-90 active:scale-[0.97]"
        >
          <UserPlus size={16} />
          Add person
        </button>
      {open && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onMouseDown={close}>
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-person-title"
          className="z-40 w-full max-w-sm rounded-lg border border-border bg-surface-raised p-5 shadow-xl"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 id="add-person-title" className="font-display text-lg font-medium text-ink">Add person</h2>
            <button type="button" aria-label="Close" onClick={close} className="text-ink-faint hover:text-ink">
              <X size={18} />
            </button>
          </div>

          {step === 'input' && (
            <div className="mt-4">
              <label htmlFor="relay-number" className="text-sm text-ink-muted">
                What&apos;s their Relay?
              </label>
              <input
                id="relay-number"
                autoFocus
                inputMode="numeric"
                placeholder="123-4567"
                value={relayNumber}
                onChange={(e) => setRelayNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-2 font-mono text-base text-ink outline-none focus-visible:border-accent"
              />
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
              <button
                onClick={handleLookup}
                disabled={loading || relayNumber.length < 7}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-ink py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Find
              </button>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="mt-4">
              <div className="flex items-center gap-3 rounded-md border border-border p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-sm font-medium text-ink">
                  {preview.display_name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{preview.display_name}</p>
                  <p className="text-xs text-ink-faint">
                    {preview.school ?? formatRelayNumber(relayNumber)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-faint">
                They&apos;ll need to accept before you can message or plan together.
              </p>
              {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 rounded-md border border-border py-2.5 text-sm font-medium text-ink-muted"
                >
                  Back
                </button>
                <button
                  onClick={handleSend}
                  disabled={loading}
                  className="flex-1 rounded-md bg-ink py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
                >
                  Send request
                </button>
              </div>
            </div>
          )}

          {step === 'sent' && preview && (
            <div className="mt-6 text-center">
              <p className="text-sm text-ink">
                Request sent to <span className="font-medium">{preview.display_name}</span>.
              </p>
              <button
                onClick={close}
                className="mt-4 w-full rounded-md bg-ink py-2.5 text-sm font-medium text-canvas"
              >
                Done
              </button>
            </div>
          )}
        </section>
        </div>
      )}
    </>
  );
}
