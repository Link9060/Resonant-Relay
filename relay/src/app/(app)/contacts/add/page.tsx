'use client';

import { lookupRelayNumber, sendConnectionRequest } from '@/lib/actions/contacts';
import { appPageUrl } from '@/lib/config';
import { formatRelayNumber } from '@/lib/utils';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

type Preview = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  school: string | null;
};

export default function AddContactPage() {
  const [relayNumber, setRelayNumber] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await lookupRelayNumber(relayNumber);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPreview(result.data);
  }

  async function handleSend() {
    if (!preview) return;
    setError(null);
    setLoading(true);
    const result = await sendConnectionRequest(preview.id);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8 md:px-6">
      <a href={appPageUrl('/contacts')} className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={16} />
        Contacts
      </a>
      <h1 className="mt-6 font-display text-2xl font-medium tracking-tight text-ink">Add person</h1>
      <p className="mt-1 text-sm text-ink-muted">Enter their seven-digit Relay Number.</p>

      {!preview && (
        <form onSubmit={handleLookup} className="mt-6">
          <label htmlFor="relay-number" className="text-sm text-ink-muted">Relay Number</label>
          <input
            id="relay-number"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123-4567"
            value={relayNumber}
            onChange={(event) => setRelayNumber(event.target.value)}
            className="mt-1.5 w-full rounded-md border border-border bg-canvas px-3 py-3 font-mono text-base text-ink outline-none focus-visible:border-accent"
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || relayNumber.replace(/\D/g, '').length !== 7}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-ink py-3 text-sm font-medium text-canvas disabled:opacity-40"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Find person
          </button>
        </form>
      )}

      {preview && !sent && (
        <div className="mt-6">
          <div className="flex items-center gap-3 rounded-md border border-border p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-sm font-medium text-ink">
              {preview.display_name[0]?.toUpperCase() ?? '?'}
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{preview.display_name}</p>
              <p className="text-xs text-ink-faint">{preview.school ?? formatRelayNumber(relayNumber)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-faint">They need to accept before you can message or plan together.</p>
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => { setPreview(null); setError(null); }} className="flex-1 rounded-md border border-border py-3 text-sm font-medium text-ink-muted">Back</button>
            <button type="button" onClick={handleSend} disabled={loading} className="flex-1 rounded-md bg-ink py-3 text-sm font-medium text-canvas disabled:opacity-40">
              {loading ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      )}

      {preview && sent && (
        <div className="mt-8 rounded-md border border-border p-5 text-center">
          <p className="text-sm text-ink">Request sent to <span className="font-medium">{preview.display_name}</span>.</p>
          <a href={appPageUrl('/contacts')} className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-ink py-3 text-sm font-medium text-canvas">Back to contacts</a>
        </div>
      )}
    </div>
  );
}
