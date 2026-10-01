'use client';

import { PageLoading } from '@/components/page-loading';
import { StaffBugHint, StaffControlHeader, StaffRequestsShortcut } from '@/components/staff-control-header';
import { appPageUrl } from '@/lib/config';
import { AppRole, getRolePreview, ROLE_PREVIEW_EVENT } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { Activity, ArrowRight, BarChart3, Database, ShieldCheck, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type StaffRole = Exclude<AppRole, 'user'>;

type UserRow = {
  id: string;
  banned_at: string | null;
};

type ReportRow = {
  report_id: string;
  reason: string;
  status: 'submitted' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  reported_name: string | null;
};

type AuditRow = {
  id: number;
  created_at: string;
  action: string;
  actor_name: string | null;
  target_name: string | null;
  metadata: Record<string, unknown> | null;
};

type Stats = {
  users: Record<string, number>;
  messaging: Record<string, number>;
  engagement: Record<string, number>;
  storage: Record<string, number>;
  generated_at: string;
};

export default function AdminPage() {
  const [actualRole, setActualRole] = useState<AppRole | null>(null);
  const [previewRole, setPreviewRole] = useState<AppRole>('user');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
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
    const effectiveRole = nextActualRole === 'owner' ? nextPreviewRole : nextActualRole;
    setActualRole(nextActualRole);
    setPreviewRole(nextPreviewRole);

    if (!isStaffRole(effectiveRole)) {
      setReports([]);
      setUsers([]);
      setStats(null);
      setAuditLog([]);
      return;
    }

    const reportResult = await supabase.rpc('staff_list_reports', {
      p_status: null,
      p_limit: 100,
      p_offset: 0,
    });
    if (reportResult.error) throw reportResult.error;
    setReports((reportResult.data ?? []) as ReportRow[]);

    if (effectiveRole === 'admin' || effectiveRole === 'owner') {
      const userResult = await supabase.rpc('admin_list_users_v2', { p_limit: 250, p_offset: 0 });
      if (userResult.error) throw userResult.error;
      setUsers((userResult.data ?? []) as UserRow[]);
    } else {
      setUsers([]);
    }

    if (effectiveRole === 'owner') {
      const [statsResult, auditResult] = await Promise.all([
        supabase.rpc('owner_dashboard_stats'),
        supabase.rpc('owner_list_audit_log', { p_limit: 80, p_offset: 0 }),
      ]);
      if (statsResult.error) throw statsResult.error;
      if (auditResult.error) throw auditResult.error;
      setStats(statsResult.data as Stats);
      setAuditLog((auditResult.data ?? []) as AuditRow[]);
    } else {
      setStats(null);
      setAuditLog([]);
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load().catch((e: any) => setError(e?.message ?? 'Control Center could not load.'));
    }, 0);

    const onPreviewChange = (event: Event) => {
      const nextRole = (event as CustomEvent<AppRole>).detail;
      setPreviewRole(nextRole);
      setStats(null);
      setUsers([]);
      setReports([]);
      setAuditLog([]);
      void load().catch((e: any) => setError(e?.message ?? 'Control Center could not load.'));
    };
    window.addEventListener(ROLE_PREVIEW_EVENT, onPreviewChange);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener(ROLE_PREVIEW_EVENT, onPreviewChange);
    };
  }, []);

  const openReports = useMemo(
    () => reports.filter((report) => report.status === 'submitted' || report.status === 'reviewing'),
    [reports],
  );

  if (actualRole === null && !error) return <PageLoading />;

  if (!role || !isStaffRole(role)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-ink">You do not have access to the Relay Control Center.</p>
          <p className="mt-1 text-sm text-ink-muted">Moderator, admin, or owner permission is required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-8">
      <StaffControlHeader role={role} active="overview" />
      {error && <div className="mt-5 rounded-xl border border-border bg-surface p-4 text-sm text-ink">{error}</div>}
      <OverviewSection role={role} stats={stats} users={users} reports={reports} auditLog={auditLog} openReports={openReports} />
    </div>
  );
}

function OverviewSection({
  role,
  stats,
  users,
  reports,
  auditLog,
  openReports,
}: {
  role: StaffRole;
  stats: Stats | null;
  users: UserRow[];
  reports: ReportRow[];
  auditLog: AuditRow[];
  openReports: ReportRow[];
}) {
  const reviewing = reports.filter((report) => report.status === 'reviewing').length;
  const resolved = reports.filter((report) => report.status === 'resolved').length;
  const banned = users.filter((user) => user.banned_at).length;

  const cards: Array<[string, number, string]> = role === 'owner' && stats
    ? [
        ['Relay users', Number(stats.users.total ?? users.length), 'Accounts currently in Relay'],
        ['Active 7d', Number(stats.users.active_7d ?? 0), 'Users seen in the last week'],
        ['Open reports', openReports.length, 'Submitted or under review'],
        ['Staff actions', auditLog.length, 'Recent audit entries loaded'],
      ]
    : role === 'admin'
      ? [
          ['Accounts', users.length, 'Accounts available to inspect'],
          ['Open reports', openReports.length, 'Needs moderation attention'],
          ['Reviewing', reviewing, 'Reports already being handled'],
          ['Disabled', banned, 'Accounts currently banned'],
        ]
      : [
          ['Open reports', openReports.length, 'Needs moderation attention'],
          ['Reviewing', reviewing, 'Reports currently in progress'],
          ['Resolved', resolved, 'Resolved reports loaded'],
          ['Queue loaded', reports.length, 'Reports available in this view'],
        ];

  return (
    <section className="mt-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, note]) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-xs font-medium text-ink-faint">{label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value.toLocaleString()}</div>
            <div className="mt-1 text-xs text-ink-muted">{note}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Needs attention</h2>
              <p className="mt-1 text-xs text-ink-muted">A short queue of work that deserves staff attention now.</p>
            </div>
            <a href={appPageUrl('/admin/moderation')} className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink">Open queue <ArrowRight size={12} /></a>
          </div>

          <div className="mt-4 space-y-2">
            {openReports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-canvas px-4 py-5 text-sm text-ink-muted">Moderation queue is clear.</div>
            ) : openReports.slice(0, 5).map((report) => (
              <a key={report.report_id} href={appPageUrl('/admin/moderation')} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-canvas px-4 py-3 transition-colors hover:bg-surface-raised">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">{humanize(report.reason)}</div>
                  <div className="mt-0.5 truncate text-xs text-ink-muted">{report.reported_name ?? 'Removed account'} · reported {timeAgo(report.created_at)}</div>
                </div>
                <StatusBadge status={report.status} />
              </a>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <StaffRequestsShortcut openReports={openReports.length} />
          <StaffBugHint />
          <WorkspaceLink href="/admin/moderation" icon={ShieldCheck} title="Moderation workspace" text="Review, resolve, dismiss, and reopen reports." />
          {(role === 'admin' || role === 'owner') && <WorkspaceLink href="/admin/users" icon={Users} title="Account directory" text="Search users and inspect account activity." />}
          {role === 'owner' && <WorkspaceLink href="/admin/analytics" icon={BarChart3} title="Owner analytics" text="Explore usage, activity, messaging, and engagement." />}
          {role === 'owner' && <WorkspaceLink href="/admin/system" icon={Database} title="System" text="Inspect verified operational state and storage." />}
          {role === 'owner' && <WorkspaceLink href="/admin/activity" icon={Activity} title="Activity" text="Review the full Owner activity workspace." />}
        </div>
      </div>

      {role === 'owner' && auditLog.length > 0 && (
        <div className="mt-5 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Recent staff activity</h2>
              <p className="mt-1 text-xs text-ink-muted">Latest actions without opening the full activity workspace.</p>
            </div>
            <a href={appPageUrl('/admin/activity')} className="text-xs font-medium text-ink-muted hover:text-ink">View all</a>
          </div>
          <div className="mt-3 divide-y divide-border">
            {auditLog.slice(0, 5).map((row) => (
              <div key={row.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-ink"><strong>{row.actor_name ?? 'Deleted staff account'}</strong> · {humanize(row.action)} · <span className="text-ink-muted">{row.target_name ?? auditTarget(row)}</span></div>
                <div className="text-xs text-ink-faint">{timeAgo(row.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function WorkspaceLink({ href, icon: Icon, title, text }: { href: string; icon: typeof ShieldCheck; title: string; text: string }) {
  return (
    <a href={appPageUrl(href)} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised">
      <Icon className="mt-0.5 shrink-0 text-ink-faint" size={16} />
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        <div className="mt-1 text-xs leading-5 text-ink-muted">{text}</div>
      </div>
    </a>
  );
}

function StatusBadge({ status }: { status: ReportRow['status'] }) {
  return <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">{status}</span>;
}

function auditTarget(row: AuditRow) {
  const metadata = row.metadata ?? {};
  if (typeof metadata.display_name === 'string') return metadata.display_name;
  if (typeof metadata.target_id === 'string') return metadata.target_id;
  return '—';
}

function isStaffRole(role: AppRole): role is StaffRole {
  return role === 'moderator' || role === 'admin' || role === 'owner';
}

function humanize(value: string) {
  return value.split('_').map((part) => part ? part.charAt(0).toUpperCase() + part.slice(1) : part).join(' ');
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
