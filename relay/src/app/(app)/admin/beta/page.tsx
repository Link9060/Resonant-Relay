'use client';

import { PageLoading } from '@/components/page-loading';
import { StaffControlHeader } from '@/components/staff-control-header';
import { createClient } from '@/lib/supabase/client';
import { Check, Clock3, FlaskConical, Loader2, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type BetaRequestRow = {
  request_id: string;
  user_id: string;
  display_name: string;
  username: string | null;
  relay_number: string;
  primary_email: string | null;
  role: 'user' | 'moderator' | 'admin' | 'owner';
  request_status: 'pending' | 'approved' | 'declined';
  request_message: string | null;
  response_message: string | null;
  requested_at: string;
  reviewed_at: string | null;
  reviewed_by_name: string | null;
};

type Filter = 'pending' | 'approved' | 'declined' | 'all';

export default function OwnerBetaPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [requests, setRequests] = useState<BetaRequestRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('pending');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(nextFilter: Filter = filter, preferredId?: string | null) {
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'owner') {
      setAuthorized(false);
      return;
    }
    setAuthorized(true);

    const { data, error: loadError } = await supabase.rpc('owner_list_beta_requests', {
      p_status: nextFilter,
      p_limit: 250,
      p_offset: 0,
    });
    if (loadError) throw loadError;
    const rows = (data ?? []) as BetaRequestRow[];
    setRequests(rows);
    const target = preferredId && rows.some((row) => row.request_id === preferredId)
      ? preferredId
      : rows[0]?.request_id ?? null;
    setSelectedId(target);
    const selected = rows.find((row) => row.request_id === target);
    setResponse(selected?.response_message ?? '');
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load('pending').catch((e: any) => setError(e?.message ?? 'Beta requests could not load.'));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return requests;
    return requests.filter((request) => [request.display_name, request.primary_email, request.username, request.relay_number, request.request_message].filter(Boolean).some((value) => String(value).toLowerCase().includes(q)));
  }, [query, requests]);

  const selected = requests.find((request) => request.request_id === selectedId) ?? null;

  function chooseRequest(request: BetaRequestRow) {
    setSelectedId(request.request_id);
    setResponse(request.response_message ?? '');
    setError(null);
  }

  async function changeFilter(next: Filter) {
    setFilter(next);
    setError(null);
    try {
      await load(next);
    } catch (e: any) {
      setError(e?.message ?? 'Beta requests could not load.');
    }
  }

  async function review(approve: boolean) {
    if (!selected || selected.request_status !== 'pending') return;
    const cleanResponse = response.trim();
    if (!cleanResponse) {
      setError('Add a response message before approving or declining this request.');
      return;
    }

    setBusy(true);
    setError(null);
    const { error: reviewError } = await (createClient() as any).rpc('owner_review_beta_request', {
      p_request_id: selected.request_id,
      p_approve: approve,
      p_message: cleanResponse,
    });
    if (reviewError) {
      setError(reviewError.message);
      setBusy(false);
      return;
    }

    await load(filter, null);
    setBusy(false);
  }

  if (authorized === null && !error) return <PageLoading />;
  if (authorized === false) {
    return <div className="mx-auto max-w-4xl px-4 py-8 md:px-6"><div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-muted">Owner view is required for Beta access requests.</div></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-8">
      <StaffControlHeader role="owner" active="beta" />

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><FlaskConical size={16} />Beta access requests</div>
          <p className="mt-1 text-xs leading-5 text-ink-muted">Approve who can enter Relay Beta. Every decision is recorded in the Owner audit log.</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
          {(['pending','approved','declined','all'] as Filter[]).map((item) => (
            <button key={item} type="button" onClick={() => void changeFilter(item)} className={`rounded-lg px-3 py-2 text-xs font-medium capitalize transition-colors ${filter === item ? 'bg-ink text-canvas' : 'text-ink-muted hover:bg-surface-raised hover:text-ink'}`}>{item}</button>
          ))}
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm text-red-500">{error}</div>}

      <div className="mt-4 grid min-h-[560px] gap-4 lg:grid-cols-[minmax(300px,.72fr)_minmax(0,1.28fr)]">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border p-4">
            <div className="text-sm font-semibold text-ink">{filter === 'pending' ? 'Waiting for review' : 'Beta request history'}</div>
            <div className="mt-1 text-xs text-ink-muted">{requests.length} {requests.length === 1 ? 'request' : 'requests'} in this view.</div>
            <label className="mt-3 flex min-h-11 items-center gap-2 rounded-lg border border-border bg-canvas px-3"><Search size={14} className="text-ink-faint" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests…" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" /></label>
          </div>
          <div className="max-h-[680px] overflow-y-auto p-2">
            {filtered.map((request) => (
              <button key={request.request_id} type="button" onClick={() => chooseRequest(request)} className={`block min-h-20 w-full rounded-xl px-3 py-3 text-left transition-colors ${selectedId === request.request_id ? 'bg-surface-raised' : 'hover:bg-canvas'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="truncate text-sm font-medium text-ink">{request.display_name}</div><div className="mt-0.5 truncate text-xs text-ink-muted">{request.username ? `@${request.username}` : request.primary_email ?? formatRelay(request.relay_number)}</div></div>
                  <StatusBadge status={request.request_status} />
                </div>
                <div className="mt-2 text-[10px] text-ink-faint">Requested {timeAgo(request.requested_at)}</div>
              </button>
            ))}
            {filtered.length === 0 && <div className="px-4 py-10 text-center text-xs text-ink-muted">No Beta requests match this view.</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          {!selected ? (
            <div className="flex min-h-80 items-center justify-center text-sm text-ink-muted">Select a Beta request to review.</div>
          ) : (
            <>
              <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xl font-semibold text-ink">{selected.display_name}</div>
                  <div className="mt-1 text-xs text-ink-muted">{selected.primary_email ?? 'No primary email'} · {formatRelay(selected.relay_number)}</div>
                  {selected.username && <div className="mt-1 text-xs text-ink-faint">@{selected.username}</div>}
                </div>
                <StatusBadge status={selected.request_status} />
              </div>

              <div className="grid gap-4 py-5 sm:grid-cols-3">
                <InfoLine label="Relay role" value={selected.role} />
                <InfoLine label="Requested" value={new Date(selected.requested_at).toLocaleString()} />
                <InfoLine label="Reviewed" value={selected.reviewed_at ? new Date(selected.reviewed_at).toLocaleString() : 'Not yet'} />
              </div>

              <div className="border-t border-border pt-5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Tester message</div>
                <div className="mt-2 min-h-20 rounded-xl border border-border bg-canvas p-4 text-sm leading-6 text-ink-muted">{selected.request_message || 'No message was included with this request.'}</div>
              </div>

              <div className="mt-5">
                <label htmlFor="beta-response" className="text-xs font-medium text-ink-muted">Response message</label>
                <textarea id="beta-response" value={response} onChange={(event) => setResponse(event.target.value)} disabled={selected.request_status !== 'pending' || busy} maxLength={1000} rows={5} placeholder="Tell them why they were approved or declined, what you want tested, or any Beta notes." className="mt-2 w-full resize-none rounded-xl border border-border bg-canvas px-3 py-3 text-sm text-ink outline-none placeholder:text-ink-faint disabled:opacity-70" />
                <div className="mt-1 text-right text-[10px] text-ink-faint">{response.length}/1000</div>
              </div>

              {selected.request_status === 'pending' ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button type="button" disabled={busy} onClick={() => void review(false)} className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}Decline</button>
                  <button type="button" disabled={busy} onClick={() => void review(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-canvas disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Approve Beta access</button>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-border bg-canvas p-4 text-xs leading-5 text-ink-muted">Reviewed by {selected.reviewed_by_name ?? 'Owner'}{selected.reviewed_at ? ` on ${new Date(selected.reviewed_at).toLocaleString()}` : ''}.</div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: BetaRequestRow['request_status'] }) {
  const Icon = status === 'approved' ? Check : status === 'declined' ? X : Clock3;
  return <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-1 text-[10px] font-medium capitalize text-ink-muted"><Icon size={11} />{status}</span>;
}
function InfoLine({ label, value }: { label: string; value: string }) { return <div><div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</div><div className="mt-1 text-sm capitalize text-ink">{value}</div></div>; }
function formatRelay(value: string) { return value?.length === 7 ? `${value.slice(0, 3)}-${value.slice(3)}` : value; }
function timeAgo(value: string) { const diff = Date.now() - new Date(value).getTime(); const minutes = Math.max(0, Math.floor(diff / 60000)); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }
