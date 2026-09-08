'use client';

import {
  getContactDiscoveryPrivacy,
  getContactDiscoverySuggestions,
  searchContactDiscovery,
  sendConnectionRequest,
  updateContactDiscoveryPrivacy,
  type DiscoveryPerson,
  type DiscoveryPrivacy,
} from '@/lib/actions/contacts';
import { Check, Clock3, Loader2, Search, ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';

const DEFAULT_PRIVACY: DiscoveryPrivacy = {
  discoverable_in_contacts: true,
  show_school_in_discovery: false,
};

export function DiscoverPeople({ onOpenRequests }: { onOpenRequests: () => void }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<DiscoveryPerson[]>([]);
  const [results, setResults] = useState<DiscoveryPerson[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [privacy, setPrivacy] = useState<DiscoveryPrivacy>(DEFAULT_PRIVACY);
  const [privacyLoaded, setPrivacyLoaded] = useState(false);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void Promise.all([getContactDiscoverySuggestions(), getContactDiscoveryPrivacy()]).then(([suggestionResult, privacyResult]) => {
        setLoadingSuggestions(false);
        if (suggestionResult.ok) setSuggestions(suggestionResult.data);
        if (privacyResult.ok) {
          setPrivacy(privacyResult.data);
          setPrivacyLoaded(true);
        }
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) {
      setError('Type at least 2 characters to search.');
      return;
    }

    setSearching(true);
    setError(null);
    const result = await searchContactDiscovery(cleanQuery);
    setSearching(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setResults(result.data);
  }

  function clearSearch() {
    setQuery('');
    setResults(null);
    setError(null);
  }

  async function add(person: DiscoveryPerson) {
    setSendingIds((current) => new Set(current).add(person.id));
    setError(null);
    const result = await sendConnectionRequest(person.id);
    setSendingIds((current) => {
      const next = new Set(current);
      next.delete(person.id);
      return next;
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    const markRequested = (items: DiscoveryPerson[]) => items.map((item) => item.id === person.id ? { ...item, request_state: 'outgoing' as const } : item);
    setSuggestions(markRequested);
    setResults((current) => current ? markRequested(current) : current);
  }

  async function savePrivacy(next: DiscoveryPrivacy) {
    if (privacySaving) return;
    const previous = privacy;
    setPrivacy(next);
    setPrivacySaving(true);
    setError(null);
    const result = await updateContactDiscoveryPrivacy(next);
    setPrivacySaving(false);
    if (!result.ok) {
      setPrivacy(previous);
      setError(result.error);
      return;
    }
    setPrivacy(result.data);
    setPrivacyLoaded(true);
  }

  const people = results ?? suggestions;
  const heading = results ? 'Search results' : 'People you may know';
  const emptyText = results
    ? `No discoverable people matched “${query.trim()}”.`
    : 'No suggestions yet. As your Relay network grows, mutual contacts and shared groups will show up here.';

  return (
    <div className="mt-5">
      <form onSubmit={search} className="flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search people by name</span>
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search people by name"
            maxLength={40}
            autoComplete="off"
            className="w-full rounded-md border border-border bg-canvas py-2.5 pl-9 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted"
          />
        </label>
        <button
          type="submit"
          disabled={searching || query.trim().length < 2}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
        >
          {searching && <Loader2 size={15} className="animate-spin" />}
          Search
        </button>
      </form>

      <p className="mt-2 text-xs text-ink-faint">Search uses names only. Relay Numbers still use the private direct-add flow.</p>

      <details className="mt-4 rounded-md border border-border bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm text-ink">
          <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-ink-faint" />Discovery privacy</span>
          <span className="text-xs text-ink-faint">{privacyLoaded ? (privacy.discoverable_in_contacts ? 'Visible' : 'Hidden') : 'Loading'}</span>
        </summary>
        <div className="border-t border-border px-3 py-3">
          <PrivacyToggle
            checked={privacy.discoverable_in_contacts}
            disabled={privacySaving || !privacyLoaded}
            title="Appear in Discover"
            text="People can find your Relay display name and see mutual-contact or shared-group counts."
            onChange={(checked) => void savePrivacy({ ...privacy, discoverable_in_contacts: checked })}
          />
          <div className="mt-3 border-t border-border pt-3">
            <PrivacyToggle
              checked={privacy.show_school_in_discovery}
              disabled={privacySaving || !privacyLoaded || !privacy.discoverable_in_contacts}
              title="Show my school"
              text="Off by default. When enabled, your school may appear beneath your name in Discover."
              onChange={(checked) => void savePrivacy({ ...privacy, show_school_in_discovery: checked })}
            />
          </div>
        </div>
      </details>

      {error && <div className="mt-4 rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-ink">{error}</div>}

      <div className="mt-7 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UsersRound size={16} className="text-ink-faint" />
          <h2 className="text-sm font-medium text-ink-muted">{heading}</h2>
        </div>
        {results && <button type="button" onClick={clearSearch} className="text-xs text-ink-faint hover:text-ink">Back to suggestions</button>}
      </div>

      {loadingSuggestions && !results ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-md border border-dashed border-border py-10 text-sm text-ink-muted">
          <Loader2 size={16} className="animate-spin" /> Finding people…
        </div>
      ) : people.length === 0 ? (
        <div className="mt-3 rounded-md border border-dashed border-border px-4 py-9 text-center">
          <p className="text-sm text-ink-muted">{emptyText}</p>
          {!results && <p className="mt-1 text-xs text-ink-faint">You can still add anyone who shares their Relay Number with you.</p>}
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border">
          {people.map((person) => (
            <PersonRow
              key={person.id}
              person={person}
              sending={sendingIds.has(person.id)}
              onAdd={() => void add(person)}
              onOpenRequests={onOpenRequests}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PrivacyToggle({
  checked,
  disabled,
  title,
  text,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  title: string;
  text: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className={`flex items-start justify-between gap-4 ${disabled ? 'opacity-55' : ''}`}>
      <div>
        <div className="text-sm font-medium text-ink">{title}</div>
        <div className="mt-0.5 text-xs leading-5 text-ink-faint">{text}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full border transition-colors ${checked ? 'border-ink bg-ink' : 'border-border bg-canvas'}`}
      >
        <span className={`absolute top-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full transition-all ${checked ? 'left-[18px] bg-canvas' : 'left-0.5 bg-ink-muted'}`}>
          {checked && <Check size={10} className="text-ink" />}
        </span>
      </button>
    </div>
  );
}

function PersonRow({
  person,
  sending,
  onAdd,
  onOpenRequests,
}: {
  person: DiscoveryPerson;
  sending: boolean;
  onAdd: () => void;
  onOpenRequests: () => void;
}) {
  const context = discoveryContext(person);

  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-xs font-semibold text-ink">
        {person.avatar_url ? (
          <Image src={person.avatar_url} alt="" fill sizes="40px" className="object-cover" unoptimized />
        ) : person.display_name[0]?.toUpperCase() ?? '?'}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{person.display_name}</p>
        <p className="mt-0.5 truncate text-xs text-ink-faint">{context || 'Relay user'}</p>
        {person.school && <p className="mt-0.5 truncate text-xs text-ink-faint">{person.school}</p>}
      </div>

      {person.request_state === 'outgoing' ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted">
          <Clock3 size={13} /> Requested
        </span>
      ) : person.request_state === 'incoming' ? (
        <button type="button" onClick={onOpenRequests} className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface">
          Review request
        </button>
      ) : (
        <button
          type="button"
          disabled={sending}
          onClick={onAdd}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-canvas disabled:opacity-45"
        >
          {sending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
          {sending ? 'Sending' : 'Add'}
        </button>
      )}
    </li>
  );
}

function discoveryContext(person: DiscoveryPerson) {
  const pieces: string[] = [];
  if (person.mutual_count > 0) pieces.push(`${person.mutual_count} mutual contact${person.mutual_count === 1 ? '' : 's'}`);
  if (person.shared_group_count > 0) pieces.push(`${person.shared_group_count} shared group${person.shared_group_count === 1 ? '' : 's'}`);
  return pieces.join(' · ');
}
