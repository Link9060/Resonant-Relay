'use client';

import { PageLoading } from '@/components/page-loading';
import { StaffControlHeader } from '@/components/staff-control-header';
import { AppRole, getRolePreview } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type ReportStatus = 'submitted' | 'reviewing' | 'resolved' | 'dismissed';
type ReportRow = {
  report_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  reporter_name: string;
  reporter_relay_number: string;
  reported_name: string | null;
  reported_relay_number: string | null;
  reported_email: string | null;
  message_body: string | null;
  moderation_note: string | null;
  resolved_by_name: string | null;
};

export default function ModerationWorkspacePage() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'open' | 'all' | ReportStatus>('open');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(preferredId?: string | null) {
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profileError) throw profileError;
    const actualRole = (profile?.role ?? 'user') as AppRole;
    const effectiveRole = actualRole === 'owner' ? getRolePreview(actualRole) : actualRole;
    setRole(effectiveRole);
    if (effectiveRole === 'user') return;
    const { data, error: reportError } = await supabase.rpc('staff_list_reports', { p_status: null, p_limit: 250, p_offset: 0 });
    if (reportError) throw reportError;
    const rows = (data ?? []) as ReportRow[];
    setReports(rows);
    setSelectedId((current) => {
      if (preferredId && rows.some((row) => row.report_id === preferredId)) return preferredId;
      if (current && rows.some((row) => row.report_id === current)) return current;
      return rows.find((row) => row.status === 'submitted' || row.status === 'reviewing')?.report_id ?? rows[0]?.report_id ?? null;
    });
  }

  useEffect(() => {
    void load().catch((e: any) => setError(e?.message ?? 'Moderation workspace could not load.'));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter((report) => {
      if (status === 'open' && !['submitted', 'reviewing'].includes(report.status)) return false;
      if (status !== 'open' && status !== 'all' && report.status !== status) return false;
      if (!q) return true;
      return [report.reason, report.reported_name, report.reporter_name, report.details, report.message_body].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    });
  }, [query, reports, status]);

  const selected = reports.find((report) => report.report_id === selectedId) ?? null;
  const counts = {
    submitted: reports.filter((report) => report.status === 'submitted').length,
    reviewing: reports.filter((report) => report.status === 'reviewing').length,
    resolved: reports.filter((report) => report.status === 'resolved').length,
  };

  async function updateStatus(next: ReportStatus) {
    if (!selected || !role || role === 'user') return;
    let note: string | null = null;
    if (next === 'resolved' || next === 'dismissed') {
      const response = window.prompt('Optional moderation note:', selected.moderation_note ?? '');
      if (response === null) return;
      note = response;
    }
    setError(null);
    setBusy(true);
    const { error: actionError } = await (createClient() as any).rpc('staff_update_report_status', { p_report_id: selected.report_id, p_status: next, p_note: note });
    if (actionError) setError(actionError.message); else await load(selected.report_id);
    setBusy(false);
  }

  if (role === null && !error) return <PageLoading />;
  if (!role || role === 'user') return <div className="mx-auto max-w-4xl px-4 py-8 md:px-6"><div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-muted">Staff permission is required for Moderation.</div></div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-8">
      <StaffControlHeader role={role} active="moderation" />
      {error && <div className="mt-5 rounded-xl border border-border bg-surface p-4 text-sm text-ink">{error}</div>}

      <div className="mt-6 grid grid-cols-3 gap-3">
        <QueueStat label="New" value={counts.submitted} />
        <QueueStat label="Reviewing" value={counts.reviewing} />
        <QueueStat label="Resolved" value={counts.resolved} />
      </div>

      <div className="mt-4 grid min-h-[560px] gap-4 lg:grid-cols-[minmax(320px,.8fr)_minmax(0,1.2fr)]">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border p-4">
            <div className="flex flex-wrap gap-2">
              {(['open', 'submitted', 'reviewing', 'resolved', 'dismissed', 'all'] as const).map((option) => <button key={option} type="button" onClick={() => setStatus(option)} className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide ${status === option ? 'border-ink bg-ink text-canvas' : 'border-border text-ink-muted hover:bg-surface-raised'}`}>{option}</button>)}
            </div>
            <label className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2"><Search size={14} className="text-ink-faint" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reports…" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" /></label>
          </div>
          <div className="max-h-[620px] overflow-y-auto p-2">
            {visible.map((report) => (
              <button key={report.report_id} type="button" onClick={() => setSelectedId(report.report_id)} className={`block w-full rounded-xl px-3 py-3 text-left transition-colors ${selectedId === report.report_id ? 'bg-surface-raised' : 'hover:bg-canvas'}`}>
                <div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-medium text-ink">{humanReason(report.reason)}</span><StatusBadge status={report.status} /></div>
                <div className="mt-1 truncate text-xs text-ink-muted">{report.reported_name ?? 'Removed account'} · {timeAgo(report.created_at)}</div>
              </button>
            ))}
            {visible.length === 0 && <div className="px-4 py-8 text-center text-xs text-ink-muted">No reports match these filters.</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          {!selected ? <div className="flex min-h-80 items-center justify-center text-sm text-ink-muted">Select a report to review.</div> : (
            <>
              <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint"><ShieldCheck size={14} /> Moderation case</div><h2 className="mt-2 text-xl font-semibold text-ink">{humanReason(selected.reason)}</h2><div className="mt-1 text-xs text-ink-muted">Opened {new Date(selected.created_at).toLocaleString()}</div></div>
                <StatusBadge status={selected.status} />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Info label="Reported account" value={`${selected.reported_name ?? 'Removed account'}${selected.reported_relay_number ? ` · ${formatRelay(selected.reported_relay_number)}` : ''}`} />
                <Info label="Reported by" value={`${selected.reporter_name} · ${formatRelay(selected.reporter_relay_number)}`} />
                {role !== 'moderator' && selected.reported_email && <Info label="Account email" value={selected.reported_email} />}
                <Info label="Last handled by" value={selected.resolved_by_name ?? 'No one yet'} />
              </div>

              {selected.details && <div className="mt-5 rounded-xl border border-border bg-canvas p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Report details</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{selected.details}</p></div>}
              {selected.message_body && <div className="mt-4 rounded-xl border border-border bg-canvas p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Reported message</div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">“{truncate(selected.message_body, 500)}”</p></div>}
              {selected.moderation_note && <div className="mt-4 rounded-xl border border-border bg-surface-raised p-4 text-sm text-ink-muted"><span className="font-medium text-ink">Staff note:</span> {selected.moderation_note}</div>}

              <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
                {selected.status === 'resolved' || selected.status === 'dismissed' ? <ActionButton disabled={busy} onClick={() => void updateStatus('submitted')}>Reopen</ActionButton> : <><ActionButton disabled={busy || selected.status === 'reviewing'} onClick={() => void updateStatus('reviewing')}>Start review</ActionButton><ActionButton disabled={busy} onClick={() => void updateStatus('resolved')}>Resolve</ActionButton><ActionButton disabled={busy} onClick={() => void updateStatus('dismissed')}>Dismiss</ActionButton></>}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function QueueStat({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-border bg-surface p-4"><div className="text-2xl font-semibold text-ink">{value.toLocaleString()}</div><div className="mt-1 text-xs text-ink-muted">{label}</div></div>; }
function StatusBadge({ status }: { status: ReportStatus }) { return <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-muted">{status}</span>; }
function Info({ label, value }: { label: string; value: string }) { return <div><div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</div><div className="mt-1 text-sm text-ink">{value}</div></div>; }
function ActionButton({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40">{children}</button>; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function humanReason(value: string) { return value.split('_').map(capitalize).join(' '); }
function formatRelay(value: string) { return value?.length === 7 ? `${value.slice(0, 3)}-${value.slice(3)}` : value; }
function truncate(value: string, max: number) { return value.length <= max ? value : `${value.slice(0, max - 1)}…`; }
function timeAgo(value: string) { const diff = Date.now() - new Date(value).getTime(); const minutes = Math.max(0, Math.floor(diff / 60000)); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }
