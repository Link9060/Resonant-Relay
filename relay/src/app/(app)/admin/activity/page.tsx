'use client';

import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { AppRole, getRolePreview, ROLE_PREVIEW_EVENT } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { Activity, CheckCircle2, ClipboardCheck, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type RequestStatus = 'new' | 'reviewing' | 'resolved' | 'dismissed';
type RequestType = 'bug_report' | 'role_application' | 'feature_request' | 'safety_report' | 'general_feedback' | 'privacy_request';

type StaffRequest = {
  request_id: string;
  request_type: RequestType;
  subject: string;
  description: string;
  requested_role: AppRole | null;
  status: RequestStatus;
  staff_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  requester_name: string;
  requester_relay_number: string;
  handled_by_name: string | null;
};

type ReportRow = {
  report_id: string;
  reason: string;
  details: string | null;
  status: 'submitted' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_name: string;
  reporter_relay_number: string;
  reported_name: string | null;
  reported_relay_number: string | null;
  moderation_note: string | null;
  resolved_at: string | null;
  resolved_by_name: string | null;
};

type AuditRow = {
  id: number;
  created_at: string;
  action: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  target_user_id: string | null;
  target_name: string | null;
  target_email: string | null;
  metadata: Record<string, unknown> | null;
};

type OwnerActivityData = {
  requests: StaffRequest[];
  reports: ReportRow[];
  audit: AuditRow[];
};

const EMPTY_DATA: OwnerActivityData = { requests: [], reports: [], audit: [] };

export default function OwnerActivityPage() {
  const [actualRole, setActualRole] = useState<AppRole | null>(null);
  const [previewRole, setPreviewRole] = useState<AppRole>('user');
  const [data, setData] = useState<OwnerActivityData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const role = actualRole === 'owner' ? previewRole : actualRole;

  useEffect(() => {
    let active = true;
    const supabase = createClient() as any;

    supabase.auth.getUser()
      .then(async ({ data: authData }: any) => {
        const user = authData?.user;
        if (!user) throw new Error('Sign in required.');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profileError) throw profileError;

        const nextActualRole = (profile?.role ?? 'user') as AppRole;
        const nextPreviewRole = getRolePreview(nextActualRole);
        if (!active) return;
        setActualRole(nextActualRole);
        setPreviewRole(nextPreviewRole);

        if (nextActualRole !== 'owner') return;
        const nextData = await fetchOwnerActivity(supabase);
        if (active) setData(nextData);
      })
      .catch((e: any) => {
        if (active) setError(e?.message ?? 'Owner activity could not load.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const onPreviewChange = (event: Event) => {
      setPreviewRole((event as CustomEvent<AppRole>).detail);
    };
    window.addEventListener(ROLE_PREVIEW_EVENT, onPreviewChange);

    return () => {
      active = false;
      window.removeEventListener(ROLE_PREVIEW_EVENT, onPreviewChange);
    };
  }, []);

  async function refresh() {
    if (actualRole !== 'owner') return;
    setRefreshing(true);
    setError(null);
    try {
      const nextData = await fetchOwnerActivity(createClient() as any);
      setData(nextData);
    } catch (e: any) {
      setError(e?.message ?? 'Owner activity could not refresh.');
    } finally {
      setRefreshing(false);
    }
  }

  const completedRequests = useMemo(() =>
    data.requests
      .filter((request) => request.status === 'resolved' || request.status === 'dismissed')
      .sort((a, b) => eventTime(b) - eventTime(a)),
    [data.requests]
  );

  const completedReports = useMemo(() =>
    data.reports
      .filter((report) => report.status === 'resolved' || report.status === 'dismissed')
      .sort((a, b) => reportTime(b) - reportTime(a)),
    [data.reports]
  );

  const recentSevenDays = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return data.audit.filter((row) => new Date(row.created_at).getTime() >= cutoff).length;
  }, [data.audit]);

  const needle = query.trim().toLowerCase();
  const visibleRequests = useMemo(() => {
    if (!needle) return completedRequests;
    return completedRequests.filter((request) => matches(needle, [
      request.subject,
      request.description,
      request.requester_name,
      request.requester_relay_number,
      request.handled_by_name,
      request.staff_note,
      typeLabel(request.request_type),
      request.status,
    ]));
  }, [completedRequests, needle]);

  const visibleReports = useMemo(() => {
    if (!needle) return completedReports;
    return completedReports.filter((report) => matches(needle, [
      report.reason,
      report.details,
      report.reporter_name,
      report.reporter_relay_number,
      report.reported_name,
      report.reported_relay_number,
      report.resolved_by_name,
      report.moderation_note,
      report.status,
    ]));
  }, [completedReports, needle]);

  const visibleAudit = useMemo(() => {
    if (!needle) return data.audit;
    return data.audit.filter((row) => matches(needle, [
      row.actor_name,
      row.actor_email,
      row.target_name,
      row.target_email,
      row.action,
      actionLabel(row),
      JSON.stringify(row.metadata ?? {}),
    ]));
  }, [data.audit, needle]);

  if (loading && !error) return <PageLoading />;

  if (role !== 'owner') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <PageHeader title="Owner Activity" />
        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-ink">Owner permission is required.</p>
          <p className="mt-1 text-sm text-ink-muted">This page contains staff accountability and completed-work history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <PageHeader title="Owner Activity" />
          <p className="mt-2 max-w-3xl text-sm text-ink-muted">
            Completed requests, moderation decisions, and staff actions stay visible here so Owner can review what was done, who did it, and when.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-surface-raised disabled:opacity-50"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && <div className="mt-5 rounded-lg border border-border bg-surface p-4 text-sm text-ink">{error}</div>}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={ClipboardCheck} label="Completed requests" value={completedRequests.length} />
        <Stat icon={ShieldCheck} label="Closed moderation reports" value={completedReports.length} />
        <Stat icon={Activity} label="Staff actions recorded" value={data.audit.length} />
        <Stat icon={CheckCircle2} label="Staff actions in 7 days" value={recentSevenDays} />
      </div>

      <label className="mt-6 flex max-w-xl items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink-muted">
        <Search size={16} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search staff, users, requests, actions..."
          className="min-w-0 flex-1 bg-transparent text-ink outline-none placeholder:text-ink-faint"
        />
      </label>

      <section className="mt-8">
        <SectionHeading
          title="Completed staff requests"
          subtitle={`${visibleRequests.length.toLocaleString()} shown · resolved and dismissed requests stay in the permanent Owner history.`}
        />
        <div className="mt-4 space-y-3">
          {visibleRequests.length === 0 ? <Empty text="No completed requests match this search." /> : visibleRequests.map((request) => (
            <article key={request.request_id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>{typeLabel(request.request_type)}</Pill>
                    <StatusPill status={request.status} />
                    {request.requested_role && <span className="text-xs text-ink-faint">Requested {capitalize(request.requested_role)}</span>}
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-ink">{request.subject}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{request.description}</p>
                  {request.staff_note && (
                    <div className="mt-3 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-ink-muted">Staff note: {request.staff_note}</div>
                  )}
                </div>
                <div className="shrink-0 text-xs leading-5 text-ink-faint md:max-w-64 md:text-right">
                  <div>Submitted by {request.requester_name}</div>
                  <div>{formatRelay(request.requester_relay_number)}</div>
                  <div className="mt-2 font-medium text-ink-muted">Handled by {request.handled_by_name ?? 'Unknown staff member'}</div>
                  <div>{formatDate(request.resolved_at ?? request.updated_at)}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Completed moderation work"
          subtitle={`${visibleReports.length.toLocaleString()} shown · resolved and dismissed abuse or message reports.`}
        />
        <div className="mt-4 space-y-3">
          {visibleReports.length === 0 ? <Empty text="No completed moderation reports match this search." /> : visibleReports.map((report) => (
            <article key={report.report_id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill>Moderation</Pill>
                    <StatusPill status={report.status} />
                    <span className="text-sm font-medium text-ink">{humanReason(report.reason)}</span>
                  </div>
                  <div className="mt-3 text-sm text-ink-muted">
                    Reported account: <span className="font-medium text-ink">{report.reported_name ?? 'Removed account'}</span>
                    {report.reported_relay_number ? ` · ${formatRelay(report.reported_relay_number)}` : ''}
                  </div>
                  <div className="mt-1 text-xs text-ink-faint">Reported by {report.reporter_name} · {formatRelay(report.reporter_relay_number)}</div>
                  {report.details && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{report.details}</p>}
                  {report.moderation_note && (
                    <div className="mt-3 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-ink-muted">Moderation note: {report.moderation_note}</div>
                  )}
                </div>
                <div className="shrink-0 text-xs leading-5 text-ink-faint md:max-w-64 md:text-right">
                  <div className="font-medium text-ink-muted">Handled by {report.resolved_by_name ?? 'Unknown staff member'}</div>
                  <div>{formatDate(report.resolved_at ?? report.created_at)}</div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading
          title="Staff activity trail"
          subtitle={`${visibleAudit.length.toLocaleString()} recorded actions shown. This includes request decisions, report decisions, role changes, bans, sign-outs, and account removals.`}
        />
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
          {visibleAudit.length === 0 ? <Empty text="No staff actions match this search." /> : visibleAudit.map((row) => (
            <div key={row.id} className="border-b border-border px-4 py-3 last:border-b-0 md:px-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink">{actionLabel(row)}</div>
                  <div className="mt-0.5 text-xs text-ink-muted">
                    {row.actor_name ?? row.actor_email ?? 'Removed staff account'}
                    {row.target_name || row.target_email ? ` → ${row.target_name ?? row.target_email}` : ''}
                  </div>
                  <AuditMetadata row={row} />
                </div>
                <div className="shrink-0 text-xs text-ink-faint">{formatDate(row.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

async function fetchOwnerActivity(supabase: any): Promise<OwnerActivityData> {
  const [requests, reports, audit] = await Promise.all([
    fetchAllRpc<StaffRequest>(supabase, 'staff_list_requests', { p_status: null }),
    fetchAllRpc<ReportRow>(supabase, 'staff_list_reports', { p_status: null }),
    fetchAllRpc<AuditRow>(supabase, 'owner_list_audit_log', {}),
  ]);
  return { requests, reports, audit };
}

async function fetchAllRpc<T>(supabase: any, rpcName: string, baseArgs: Record<string, unknown>): Promise<T[]> {
  const rows: T[] = [];
  let offset = 0;
  const pageSize = 250;

  while (true) {
    const { data, error } = await supabase.rpc(rpcName, {
      ...baseArgs,
      p_limit: pageSize,
      p_offset: offset,
    });
    if (error) throw error;
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }

  return rows;
}

function Stat({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <Icon size={17} className="text-ink-muted" />
      <div className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value.toLocaleString()}</div>
      <div className="mt-1 text-xs text-ink-muted">{label}</div>
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><h2 className="text-lg font-semibold text-ink">{title}</h2><p className="mt-1 text-sm text-ink-muted">{subtitle}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="px-5 py-8 text-center text-sm text-ink-muted">{text}</div>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-ink px-2 py-1 text-[10px] font-medium text-canvas">{children}</span>;
}

function StatusPill({ status }: { status: string }) {
  return <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium text-ink-muted">{capitalize(status)}</span>;
}

function AuditMetadata({ row }: { row: AuditRow }) {
  const metadata = row.metadata ?? {};
  const bits: string[] = [];
  if (typeof metadata.old_status === 'string' && typeof metadata.new_status === 'string') bits.push(`${capitalize(metadata.old_status)} → ${capitalize(metadata.new_status)}`);
  if (typeof metadata.old_role === 'string' && typeof metadata.new_role === 'string') bits.push(`${capitalize(metadata.old_role)} → ${capitalize(metadata.new_role)}`);
  if (typeof metadata.reason === 'string' && metadata.reason) bits.push(`Reason: ${metadata.reason}`);
  if (typeof metadata.request_type === 'string') bits.push(typeLabel(metadata.request_type as RequestType));
  if (bits.length === 0) return null;
  return <div className="mt-1 text-[11px] text-ink-faint">{bits.join(' · ')}</div>;
}

function actionLabel(row: AuditRow) {
  const metadata = row.metadata ?? {};
  if (row.action === 'staff_request_status') {
    const status = typeof metadata.new_status === 'string' ? capitalize(metadata.new_status) : 'Updated';
    const type = typeof metadata.request_type === 'string' ? typeLabel(metadata.request_type as RequestType) : 'staff request';
    return `${status} ${type}`;
  }
  if (row.action === 'update_report_status') {
    const status = typeof metadata.new_status === 'string' ? capitalize(metadata.new_status) : 'Updated';
    return `${status} moderation report`;
  }
  if (row.action === 'set_user_role') return 'Changed account role';
  if (row.action === 'ban_user') return 'Banned account';
  if (row.action === 'unban_user') return 'Unbanned account';
  if (row.action === 'force_sign_out') return 'Forced account sign-out';
  if (row.action === 'delete_user') return 'Removed account';
  return row.action.split('_').map(capitalize).join(' ');
}

function typeLabel(type: RequestType) {
  if (type === 'bug_report') return 'Bug report';
  if (type === 'role_application') return 'Role application';
  if (type === 'feature_request') return 'Feature request';
  if (type === 'safety_report') return 'Safety / abuse';
  if (type === 'general_feedback') return 'General feedback';
  return 'Privacy / data';
}

function humanReason(value: string) {
  return value.split('_').map(capitalize).join(' ');
}

function matches(needle: string, values: Array<unknown>) {
  return values.filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
}

function eventTime(request: StaffRequest) {
  return new Date(request.resolved_at ?? request.updated_at ?? request.created_at).getTime();
}

function reportTime(report: ReportRow) {
  return new Date(report.resolved_at ?? report.created_at).getTime();
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatRelay(value: string) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return value || 'No Relay number';
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}
