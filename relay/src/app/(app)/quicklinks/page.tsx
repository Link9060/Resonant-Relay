'use client';

import { PageHeader } from '@/components/ui/page-header';
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

type QuickLink = { id: string; label: string; url: string };

const STORAGE_KEY = 'relay-quick-links-v1';

export default function QuickLinksPage() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
      // Hydrate this device-local store only after the browser is available.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(saved)) setLinks(saved.filter(isQuickLink).slice(0, 60));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }, [links, loaded]);

  const sortedLinks = useMemo(() => [...links].sort((a, b) => a.label.localeCompare(b.label)), [links]);

  function addLink(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const name = label.trim();
    const normalized = normalizeUrl(url);
    if (!name) return setError('Give this shortcut a name.');
    if (!normalized) return setError('Enter a valid http or https address.');
    setLinks((current) => [...current, { id: crypto.randomUUID(), label: name.slice(0, 60), url: normalized }]);
    setLabel('');
    setUrl('');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <PageHeader title="Quick Links" subtitle="A clean launchpad for the sites you use on this Mac." />

      <form onSubmit={addLink} className="mt-7 grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm md:grid-cols-[minmax(0,.7fr)_minmax(0,1.3fr)_auto] md:items-end">
        <label className="grid gap-1.5 text-xs font-medium text-ink-muted">
          Name
          <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={60} placeholder="School portal" className="h-11 rounded-xl border border-border bg-canvas px-3 text-sm text-ink outline-none transition focus:border-ink/40" />
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-ink-muted">
          Web address
          <input value={url} onChange={(event) => setUrl(event.target.value)} inputMode="url" placeholder="https://example.com" className="h-11 rounded-xl border border-border bg-canvas px-3 text-sm text-ink outline-none transition focus:border-ink/40" />
        </label>
        <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-canvas transition-opacity hover:opacity-85"><Plus size={16} />Add link</button>
        {error && <p className="text-xs text-red-500 md:col-span-3">{error}</p>}
      </form>

      {!loaded ? null : sortedLinks.length === 0 ? (
        <section className="mt-6 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-surface text-ink-muted"><Link2 size={19} /></span>
          <h2 className="mt-4 text-sm font-medium text-ink">Your launchpad is empty</h2>
          <p className="mt-1 text-xs leading-5 text-ink-faint">Add a site above. Quick Links stay private to this Mac.</p>
        </section>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sortedLinks.map((link) => (
            <article key={link.id} className="group relative rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-sm">
              <a href={link.url} target="_blank" rel="noreferrer" className="block pr-9 focus:outline-none">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-canvas text-ink-muted"><ExternalLink size={15} /></span>
                <h2 className="mt-4 truncate text-sm font-medium text-ink">{link.label}</h2>
                <p className="mt-1 truncate text-xs text-ink-faint">{hostname(link.url)}</p>
                <span className="absolute inset-0 rounded-2xl" />
              </a>
              <button type="button" onClick={() => setLinks((current) => current.filter((item) => item.id !== link.id))} aria-label={`Remove ${link.label}`} className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint opacity-0 transition hover:bg-canvas hover:text-red-500 focus:opacity-100 group-hover:opacity-100"><Trash2 size={14} /></button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function normalizeUrl(value: string) {
  try {
    const candidate = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
    const parsed = new URL(candidate);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function isQuickLink(value: unknown): value is QuickLink {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.label === 'string' && typeof item.url === 'string';
}
