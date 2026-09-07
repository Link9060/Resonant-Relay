'use client';

import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { AppRole, getRolePreview, ROLE_PREVIEW_EVENT } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { Check, Clock3, ExternalLink, Inbox, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type RequestStatus = 'new' | 'reviewing' | 'resolved' | 'dismissed';
type RequestType = 'bug_report' | 'role_application' | 'feature_request' | 'safety_report' | 'general_feedback' | 'privacy_request';

type StaffRequest = {
  request_id: string;
  request_type: RequestType;
  subject: string;
  description: string;
  requested_role: AppRole | null;
  metadata: Record<string, unknown> | null;
  status: RequestStatus;
  staff_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  requester_id: string;
  requester_name: string;
  requester_relay_number: string;
  handled_by: string | null;
  handled_by_name: string | null;
};

export default function StaffRequestsPage() {
  const [actualRole, setActualRole] = useState<AppRole | null>(null);
  const [previewRole, setPreviewRole] = useState<AppRole>('user');
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<'open' | 'all' | RequestStatus>('open');
  const [typeFilter, setTypeFilter] = useState<'all' | RequestType>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const role = actualRole === 'owner' ? previewRole : actualRole;

  async function load() {
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profileError) throw profileError;

    const nextActualRole = (profile?.role ?? 'user') as AppRole;
    const nextPreviewRole = getRolePreview(nextActualRole);
    setActualRole(nextActualRole);
    setPreviewRole(nextPreviewRole);

    if (!isStaff(nextActualRole)) {
      setRequests([]);
      return;
    }

    const { data, error: requestError } = await supabase.rpc('staff_list_requests', {
      p_status: null,
      p_limit: 250,
      p_offset: 0,
    });
    if (requestError) throw requestError;
    setRequests((data ?? []) as StaffRequest[]);
  }

  useEffect(() => {
    void load().catch((e: any) => setError(e?.message ?? 'Staff requests could not load.'));

    const onPreviewChange = (event: Event) => {
      setPreviewRole((event as CustomEvent<AppRole>).detail);
    };
    window.addEventListener(ROLE_PREVIEW_EVENT, onPreviewChange);
    return () => window.removeEventListener(ROLE_PREVIEW_EVENT, onPreviewChange);
  }, []);

  const visibleRequests = useMemo(() => {
    if (!role || !isStaff(role)) return [];
    return requests.filter((request) => {
      if (!visibleToRole(role, request.request_type)) return false;
      if (typeFilter !== 'all' && request.request_type !== typeFilter) return false;
      if (statusFilter === 'open' && !['new', 'reviewing'].includes(request.status)) return false;
      if (statusFilter !== 'open' && statusFilter !== 'all' && request.status !== statusFilter) return false;
      return true;
    });
  }, [requests, role, statusFilter, typeFilter]);

  const openCount = useMemo(() => requests.filter((r) => role && isStaff(role) && visibleToRole(role, r.request_type) && ['new', 'reviewing'].includes(r.status)).length, [requests, role]);
  const newCount = useMemo(() => requests.filter((r) => role && isStaff(role) && visibleToRole(role, r.request_type) && r.status === 'new').length, [requests, role]);

  async function updateStatus(request: StaffRequest, status: RequestStatus) {
    if (!role || !isStaff(role)) return;
    let note: string | null = null;
    if (status === 'resolved' || status === 'dismissed') {
      const response = window.prompt('Optional staff note visible to the user:', request.staff_note ?? '');
      if (response === null) return;
      note = response;
    }

    setBusy(request.request_id);
    setError(null);
    const supabase = createClient() as any;
    const { error: updateError } = await supabase.rpc('staff_update_request_status', {
      p_request_id: request.request_id,
      p_status: status,
      p_note: note,
    });
    if (updateError) setError(updateError.message);
    else await load();
    setBusy(null);
  }

  async function approveRole(request: StaffRequest) {
    if (role !== 'owner' || request.request_type !== 'role_application') return;
    if (!window.confirm(`Approve ${request.requester_name} as ${capitalize(String(request.requested_role))}?`)) return;

    const note = window.prompt('Optional note for the applicant:', 'Role application approved.') ?? null;
    if (note === null) return;

    setBusy(request.request_id);
    setError(null);
    const supabase = createClient() as any;
    const { error: approveError } = await supabase.rpc('owner_approve_role_request', {
      p_request_id: request.request_id,
      p_note: note,
    });
    if (approveError) setError(approveError.message);
    else await load();
    setBusy(null);
  }

  if (actualRole === null && !error) return <PageLoading />;

  if (!role || !isStaff(role)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <PageHeader title="Staff Inbox" />
        <div className="mt-6 rounded-xl border border-border bg-surface p-6 text-sm text-ink-muted">Staff permission is required.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <PageHeader title="Staff Inbox" />
      <p className="mt-2 text-sm text-ink-muted">Requests are routed automatically by staff role. You only see the categories available to your current view.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat label="New" value={newCount} />
        <Stat label="Open" value={openCount} />
        <Stat label="Visible to you" value={requests.filter((r) => visibleToRole(role, r.request_type)).length} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
          <option value="open">Open requests</option>
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="reviewing">Reviewing</option>
          <option value="resolved">Resolved</option>
          <option value="dismissed">Dismissed</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink">
          <option value="all">All request types</option>
          {requestTypesForRole(role).map((type) => <option key={type} value={type}>{typeLabel(type)}</option>)}
        </select>
      </div>

      {error && <div className="mt-5 rounded-lg border border-border bg-surface p-4 text-sm text-ink">{error}</div>}

      <div className="mt-5 space-y-3">
        {visibleRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-10 text-center">
            <Inbox className="mx-auto text-ink-faint" size={26} />
            <div className="mt-3 text-sm font-medium text-ink">Inbox clear</div>
            <div className="mt-1 text-xs text-ink-muted">No requests match these filters.</div>
          </div>
        ) : visibleRequests.map((request) => (
          <article key={request.request_id} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <TypeBadge type={request.request_type} />
                  <StatusBadge status={request.status} />
                  {request.requested_role && <span className="rounded-full border border-border px-2 py-1 text-[10px] text-ink-muted">Applying for {capitalize(request.requested_role)}</span>}
                </div>
                <h2 className="mt-3 text-base font-semibold text-ink">{request.subject}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{request.description}</p>

                <div className="mt-4 text-xs text-ink-faint">
                  {request.requester_name} · {formatRelay(request.requester_relay_number)} · {new Date(request.created_at).toLocaleString()}
                  {request.handled_by_name ? ` · Last handled by ${request.handled_by_name}` : ''}
                </div>

                {request.request_type === 'bug_report' && request.metadata && (
                  <BugMetadata metadata={request.metadata} />
                )}

                {request.staff_note && (
                  <div className="mt-4 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-ink-muted">Staff note: {request.staff_note}</div>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-64 lg:justify-end">
                {request.status === 'new' && (
                  <ActionButton disabled={busy === request.request_id} onClick={() => void updateStatus(request, 'reviewing')} icon={Clock3}>Review</ActionButton>
                )}
                {role === 'owner' && request.request_type === 'role_application' && !['resolved', 'dismissed'].includes(request.status) && (
                  <ActionButton disabled={busy === request.request_id} onClick={() => void approveRole(request)} icon={Check}>Approve role</ActionButton>
                )}
                {!['resolved', 'dismissed'].includes(request.status) && (
                  <>
                    <ActionButton disabled={busy === request.request_id} onClick={() => void updateStatus(request, 'resolved')} icon={Check}>Resolve</ActionButton>
                    <ActionButton disabled={busy === request.request_id} onClick={() => void updateStatus(request, 'dismissed')} icon={X}>Dismiss</ActionButton>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-border bg-surface px-4 py-3"><div className="text-xs text-ink-faint">{label}</div><div className="mt-1 text-2xl font-semibold text-ink">{value}</div></div>;
}

function ActionButton({ children, disabled, onClick, icon: Icon }: { children: React.ReactNode; disabled: boolean; onClick: () => void; icon: typeof Check }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-raised disabled:opacity-50"><Icon size={14} />{children}</button>;
}

function TypeBadge({ type }: { type: RequestType }) {
  return <span className="rounded-full bg-ink px-2 py-1 text-[10px] font-medium text-canvas">{typeLabel(type)}</span>;
}

function StatusBadge({ status }: { status: RequestStatus }) {
  return <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-ink-muted">{capitalize(status)}</span>;
}

function BugMetadata({ metadata }: { metadata: Record<string, unknown> }) {
  const where = typeof metadata.where_it_happened === 'string' ? metadata.where_it_happened : null;
  const severity = typeof metadata.severity === 'string' ? metadata.severity : null;
  const viewport = typeof metadata.viewport === 'string' ? metadata.viewport : null;
  const referrer = typeof metadata.referrer === 'string' ? metadata.referrer : null;
  if (!where && !severity && !viewport && !referrer) return null;

  return (
    <div className="mt-4 rounded-lg border border-border bg-canvas p-3 text-xs text-ink-muted">
      <div className="font-medium text-ink">Automatic bug context</div>
      {where && <div className="mt-1">Area: {where}</div>}
      {severity && <div>Severity: {capitalize(severity)}</div>}
      {viewport && <div>Viewport: {viewport}</div>}
      {referrer && <div className="mt-1 flex items-center gap-1 truncate"><ExternalLink size={11} />Previous page: {referrer}</div>}
    </div>
  );
}

function isStaff(role: AppRole): role is 'moderator' | 'admin' | 'owner' {
  return role !== 'user';
}

function visibleToRole(role: AppRole, type: RequestType) {
  if (role === 'owner') return true;
  if (role === 'admin') return ['bug_report', 'feature_request', 'safety_report', 'general_feedback'].includes(type);
  if (role === 'moderator') return type === 'safety_report';
  return false;
}

function requestTypesForRole(role: AppRole): RequestType[] {
  const all: RequestType[] = ['bug_report', 'role_application', 'feature_request', 'safety_report', 'general_feedback', 'privacy_request'];
  return all.filter((type) => visibleToRole(role, type));
}

function typeLabel(type: RequestType) {
  if (type === 'bug_report') return 'Bug';
  if (type === 'role_application') return 'Role Application';
  if (type === 'feature_request') return 'Feature';
  if (type === 'safety_report') return 'Safety / Abuse';
  if (type === 'general_feedback') return 'Feedback';
  return 'Privacy / Data';
}

function formatRelay(value: string) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value || 'No Relay number';
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
