'use client';

import { getBlockedPeople, unblockContact, type BlockedPerson } from '@/lib/actions/contacts';
import { appPageUrl } from '@/lib/config';
import { Ban, Loader2, MoreHorizontal, Search, UserPlus, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export function ContactsMoreMenu({ onOpenDiscovery }: { onOpenDiscovery: () => void }) {
  const [open, setOpen] = useState(false);
  const [blockedOpen, setBlockedOpen] = useState(false);

  function closeAll() {
    setOpen(false);
    setBlockedOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="More contact options"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-md border border-border text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && !blockedOpen && (
        <>
          <button type="button" aria-label="Close contact menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/15 sm:bg-transparent" />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border bg-surface px-4 pt-3 shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-12 sm:w-64 sm:rounded-xl sm:border sm:p-2 sm:shadow-xl" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
            <a href={appPageUrl('/contacts/add')} className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink hover:bg-canvas sm:min-h-10">
              <UserPlus size={17} className="text-ink-muted" />Add by Relay Number
            </a>
            <button type="button" onClick={() => { setBlockedOpen(true); setOpen(true); }} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-ink hover:bg-canvas sm:min-h-10">
              <Ban size={17} className="text-ink-muted" />Blocked people
            </button>
            <button type="button" onClick={() => { closeAll(); onOpenDiscovery(); }} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium text-ink hover:bg-canvas sm:min-h-10">
              <Search size={17} className="text-ink-muted" />Discovery privacy
            </button>
          </div>
        </>
      )}

      {blockedOpen && <BlockedPeoplePanel onClose={closeAll} />}
    </div>
  );
}

function BlockedPeoplePanel({ onClose }: { onClose: () => void }) {
  const [people, setPeople] = useState<BlockedPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void getBlockedPeople().then((result) => {
        if (!active) return;
        setLoading(false);
        if (result.ok) setPeople(result.data);
        else setError(result.error);
      });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, []);

  async function unblock(person: BlockedPerson) {
    if (!window.confirm(`Unblock ${person.display_name}? They can find and contact you again according to your privacy settings.`)) return;
    setBusyId(person.id);
    setError(null);
    const result = await unblockContact(person.id);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPeople((current) => current.filter((item) => item.id !== person.id));
  }

  return (
    <>
      <button type="button" aria-label="Close blocked people" onClick={onClose} className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" />
      <section className="fixed inset-x-0 bottom-0 z-50 max-h-[82dvh] overflow-hidden rounded-t-3xl border-t border-border bg-surface shadow-2xl sm:inset-auto sm:right-0 sm:top-12 sm:w-[420px] sm:max-h-[620px] sm:rounded-2xl sm:border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-border sm:hidden" />
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h2 className="text-base font-semibold text-ink">Blocked people</h2>
            <p className="mt-1 text-xs leading-5 text-ink-muted">Blocked people cannot message you, send connection requests, or appear in Discover.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-muted sm:h-9 sm:w-9"><X size={18} /></button>
        </div>

        <div className="max-h-[60dvh] overflow-y-auto px-3 py-3 sm:max-h-[480px]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-muted"><Loader2 size={16} className="animate-spin" />Loading blocked people…</div>
          ) : error ? (
            <div className="rounded-lg border border-border bg-canvas p-4 text-sm text-ink-muted">{error}</div>
          ) : people.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center"><p className="text-sm text-ink-muted">Nobody is blocked.</p></div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {people.map((person) => (
                <li key={person.id} className="flex min-h-16 items-center gap-3 px-3 py-3">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-canvas text-xs font-semibold text-ink">
                    {person.avatar_url ? <Image src={person.avatar_url} alt="" fill sizes="44px" className="object-cover" unoptimized /> : person.display_name[0]?.toUpperCase() ?? '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{person.display_name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-faint">Blocked {formatBlockedDate(person.blocked_at)}</p>
                  </div>
                  <button type="button" disabled={busyId === person.id} onClick={() => void unblock(person)} className="min-h-10 shrink-0 rounded-lg border border-border px-3 text-xs font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-50">
                    {busyId === person.id ? 'Unblocking…' : 'Unblock'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function formatBlockedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'recently' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
}
