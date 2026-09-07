'use client';

import { PageLoading } from '@/components/page-loading';
import { StaffBugHint, StaffControlHeader, StaffRequestsShortcut, StaffSection } from '@/components/staff-control-header';
import { appPageUrl } from '@/lib/config';
import { AppRole, getRolePreview, ROLE_PREVIEW_EVENT } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { Activity, ArrowRight, BarChart3, Database, Inbox, ShieldCheck, Users as UsersIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Role = AppRole;
type StaffRole = Exclude<Role, 'user'>;

type UserRow = {
  id: string;
  display_name: string;
  relay_number: string;
  school: string | null;
  role: Role;
  created_at: string;
  primary_email: string | null;
  last_sign_in_at: string | null;
  gmail_connected: boolean;
  message_count: number;
  connection_count: number;
  banned_at: string | null;
  ban_reason: string | null;
  report_count: number;
  open_report_count: number;
};

type ReportRow = {
  report_id: string;
  reason: string;
  details: string | null;
  status: 'submitted' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_id: string;
  reporter_name: string;
  reporter_relay_number: string;
  reported_user_id: string | null;
  reported_name: string | null;
  reported_relay_number: string | null;
  reported_email: string | null;
  message_id: string | null;
  message_body: string | null;
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

type Stats = {
  users: Record<string, number>;
  messaging: Record<string, number>;
  engagement: Record<string, number>;
  storage: Record<string, number>;
  generated_at: string;
};

const ROLE_ORDER: Role[] = ['user', 'moderator', 'admin', 'owner'];
const OWNER_SECTIONS: StaffSection[] = ['overview', 'users', 'moderation', 'analytics', 'system', 'activity'];
const ADMIN_SECTIONS: StaffSection[] = ['overview', 'users', 'moderation'];
const MODERATOR_SECTIONS: StaffSection[] = ['overview', 'moderation'];

export default function AdminPage() {
  const [actualRole, setActualRole] = useState<Role | null>(null);
  const [previewRole, setPreviewRole] = useState<Role>('user');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [busyReport, setBusyReport] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [requestedSection, setRequestedSection] = useState<StaffSection>('overview');

  const role = actualRole === 'owner' ? previewRole : actualRole;

  async function load() {
    setError(null);
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    const currentActualRole = (profile?.role ?? 'user') as Role;
    const currentPreviewRole = getRolePreview(currentActualRole);
    setActualRole(currentActualRole);
    setPreviewRole(currentPreviewRole);

    const effectiveRole = currentActualRole === 'owner' ? currentPreviewRole : currentActualRole;
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
    const section = new URLSearchParams(window.location.search).get('section') as StaffSection | null;
    if (section) setRequestedSection(section);

    void load().catch((e: any) => setError(e?.message ?? 'Control Center could not load.'));

    const onPreviewChange = (event: Event) => {
      const nextRole = (event as CustomEvent<Role>).detail;
      setPreviewRole(nextRole);
      setStats(null);
      setUsers([]);
      setReports([]);
      setAuditLog([]);
      setRequestedSection('overview');
      void load().catch((e: any) => setError(e?.message ?? 'Control Center could not load.'));
    };
    window.addEventListener(ROLE_PREVIEW_EVENT, onPreviewChange);
    return () => window.removeEventListener(ROLE_PREVIEW_EVENT, onPreviewChange);
  }, []);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.display_name, user.primary_email, user.relay_number, user.school, user.role, user.ban_reason]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [query, users]);

  async function changeRole(userId: string, nextRole: Role) {
    if (role !== 'owner') return;
    setBusyUser(userId);
    setError(null);
    const supabase = createClient() as any;
    const { error: roleError } = await supabase.rpc('set_user_role', {
      p_user_id: userId,
      p_role: nextRole,
    });
    if (roleError) setError(roleError.message);
    else await load();
    setBusyUser(null);
  }

  async function toggleBan(user: UserRow) {
    if (role !== 'owner') return;
    const banning = !user.banned_at;
    let reason: string | null = null;

    if (banning) {
      reason = window.prompt(`Optional reason for banning ${user.display_name}:`, '') ?? null;
      if (reason === null) return;
    } else if (!window.confirm(`Unban ${user.display_name}? They will be able to sign in again.`)) {
      return;
    }

    setBusyUser(user.id);
    setError(null);
    const supabase = createClient() as any;
    const { error: banError } = await supabase.rpc('owner_set_user_ban', {
      p_user_id: user.id,
      p_banned: banning,
      p_reason: reason || null,
    });
    if (banError) setError(banError.message);
    else await load();
    setBusyUser(null);
  }

  async function forceSignOut(user: UserRow) {
    if (role !== 'owner') return;
    if (!window.confirm(`Force ${user.display_name} to sign out on all devices?`)) return;
    setBusyUser(user.id);
    setError(null);
    const supabase = createClient() as any;
    const { error: signOutError } = await supabase.rpc('owner_force_sign_out', { p_user_id: user.id });
    if (signOutError) setError(signOutError.message);
    else await load();
    setBusyUser(null);
  }

  async function removeUser(user: UserRow) {
    if (role !== 'owner') return;
    const confirmation = window.prompt(
      `Permanently remove ${user.display_name} (${user.primary_email ?? formatRelay(user.relay_number)}) and their Relay data? Type REMOVE to confirm.`,
    );
    if (confirmation !== 'REMOVE') return;

    setBusyUser(user.id);
    setError(null);
    const supabase = createClient() as any;
    const { error: deleteError } = await supabase.rpc('owner_delete_user', { p_user_id: user.id });
    if (deleteError) setError(deleteError.message);
    else await load();
    setBusyUser(null);
  }

  async function updateReport(report: ReportRow, nextStatus: ReportRow['status']) {
    if (!role || !isStaffRole(role)) return;
    let note: string | null = null;
    if (nextStatus === 'resolved' || nextStatus === 'dismissed') {
      const response = window.prompt('Optional moderation note:', report.moderation_note ?? '');
      if (response === null) return;
      note = response;
    }

    setBusyReport(report.report_id);
    setError(null);
    const supabase = createClient() as any;
    const { error: reportError } = await supabase.rpc('staff_update_report_status', {
      p_report_id: report.report_id,
      p_status: nextStatus,
      p_note: note,
    });
    if (reportError) setError(reportError.message);
    else await load();
    setBusyReport(null);
  }

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

  const staffRole = role as StaffRole;
  const section = allowedSection(staffRole, requestedSection);

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-8">
      <StaffControlHeader role={staffRole} active={section} />

      {error && <div className="mt-5 rounded-xl border border-border bg-surface p-4 text-sm text-ink">{error}</div>}

      {section === 'overview' && <OverviewSection role={staffRole} stats={stats} users={users} reports={reports} auditLog={auditLog} />}
      {section === 'users' && (staffRole === 'admin' || staffRole === 'owner') && (
        <UsersSection
          role={staffRole}
          users={users}
          filteredUsers={filteredUsers}
          query={query}
          onQueryChange={setQuery}
          currentUserId={currentUserId}
          busyUser={busyUser}
          onRoleChange={changeRole}
          onToggleBan={toggleBan}
          onForceSignOut={forceSignOut}
          onRemoveUser={removeUser}
        />
      )}
      {section === 'moderation' && <ReportsSection reports={reports} busyReport={busyReport} role={staffRole} onUpdate={updateReport} />}
      {section === 'analytics' && staffRole === 'owner' && stats && <OwnerAnalytics stats={stats} />}
      {section === 'system' && staffRole === 'owner' && stats && <SystemSnapshot stats={stats} />}
      {section === 'activity' && staffRole === 'owner' && <AuditSection rows={auditLog} />}
    </div>
  );
}

function OverviewSection({ role, stats, users, reports, auditLog }: { role: StaffRole; stats: Stats | null; users: UserRow[]; reports: ReportRow[]; auditLog: AuditRow[] }) {
  const openReports = reports.filter((report) => report.status === 'submitted' || report.status === 'reviewing');
  const reviewing = reports.filter((report) => report.status === 'reviewing').length;
  const resolved = reports.filter((report) => report.status === 'resolved').length;
  const banned = users.filter((user) => user.banned_at).length;

  const cards = role === 'owner' && stats
    ? [
        ['Relay users', stats.users.total ?? users.length, 'Accounts currently in Relay'],
        ['Active 7d', stats.users.active_7d ?? 0, 'Users seen in the last week'],
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
          <div key={String(label)} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-xs font-medium text-ink-faint">{label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{Number(value).toLocaleString()}</div>
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
            <a href={appPageUrl('/admin?section=moderation')} className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink">Open queue <ArrowRight size={12} /></a>
          </div>

          <div className="mt-4 space-y-2">
            {openReports.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-canvas px-4 py-5 text-sm text-ink-muted">Moderation queue is clear.</div>
            ) : openReports.slice(0, 5).map((report) => (
              <a key={report.report_id} href={appPageUrl('/admin?section=moderation')} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-canvas px-4 py-3 transition-colors hover:bg-surface-raised">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-ink">{humanReason(report.reason)}</div>
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
          <QuickWorkspaceLink href="/admin?section=moderation" icon={ShieldCheck} title="Moderation workspace" text="Review, resolve, dismiss, and reopen reports." />
          {(role === 'admin' || role === 'owner') && <QuickWorkspaceLink href="/admin?section=users" icon={UsersIcon} title="Account directory" text="Search users and inspect account activity." />}
          {role === 'owner' && <QuickWorkspaceLink href="/admin?section=activity" icon={Activity} title="Audit trail" text="See recent staff actions and owner changes." />}
        </div>
      </div>

      {role === 'owner' && auditLog.length > 0 && (
        <div className="mt-5 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-ink">Recent staff activity</h2>
              <p className="mt-1 text-xs text-ink-muted">Latest actions without opening the full audit trail.</p>
            </div>
            <a href={appPageUrl('/admin?section=activity')} className="text-xs font-medium text-ink-muted hover:text-ink">View all</a>
          </div>
          <div className="mt-3 divide-y divide-border">
            {auditLog.slice(0, 5).map((row) => (
              <div key={row.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-ink"><strong>{row.actor_name ?? 'Deleted staff account'}</strong> · {humanAction(row.action)} · <span className="text-ink-muted">{row.target_name ?? auditTarget(row)}</span></div>
                <div className="text-xs text-ink-faint">{timeAgo(row.created_at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function QuickWorkspaceLink({ href, icon: Icon, title, text }: { href: string; icon: typeof ShieldCheck; title: string; text: string }) {
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

function UsersSection({
  role,
  users,
  filteredUsers,
  query,
  onQueryChange,
  currentUserId,
  busyUser,
  onRoleChange,
  onToggleBan,
  onForceSignOut,
  onRemoveUser,
}: {
  role: 'admin' | 'owner';
  users: UserRow[];
  filteredUsers: UserRow[];
  query: string;
  onQueryChange: (value: string) => void;
  currentUserId: string | null;
  busyUser: string | null;
  onRoleChange: (userId: string, role: Role) => Promise<void>;
  onToggleBan: (user: UserRow) => Promise<void>;
  onForceSignOut: (user: UserRow) => Promise<void>;
  onRemoveUser: (user: UserRow) => Promise<void>;
}) {
  return (
    <section className="mt-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><UsersIcon size={17} className="text-ink-faint" /><h2 className="text-lg font-semibold text-ink">Users</h2></div>
          <p className="mt-1 text-sm text-ink-muted">{users.length} Relay accounts. Destructive owner controls stay separated from normal account inspection.</p>
        </div>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search accounts or emails"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink-faint sm:w-72"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-canvas/50 text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Activity</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Reports</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              {role === 'owner' && <th className="px-4 py-3 font-medium">Owner tools</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredUsers.map((user) => {
              const protectedAccount = user.id === currentUserId || user.role === 'owner';
              return (
                <tr key={user.id} className="transition-colors hover:bg-canvas/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{user.display_name}</div>
                    <div className="text-xs text-ink-muted">{user.primary_email ?? 'No primary email'} · {formatRelay(user.relay_number)}</div>
                    {user.gmail_connected && <div className="mt-1 text-xs text-ink-faint">Gmail linked</div>}
                  </td>
                  <td className="px-4 py-3">
                    {user.banned_at ? (
                      <div>
                        <span className="rounded-full border border-ink px-2 py-1 text-xs font-medium text-ink">Banned</span>
                        {user.ban_reason && <div className="mt-2 max-w-48 text-xs text-ink-muted">{user.ban_reason}</div>}
                      </div>
                    ) : <span className="rounded-full border border-border px-2 py-1 text-xs font-medium text-ink-muted">Active</span>}
                  </td>
                  <td className="px-4 py-3">
                    {role === 'owner' ? (
                      <select
                        value={user.role}
                        disabled={busyUser === user.id || user.id === currentUserId}
                        onChange={(e) => void onRoleChange(user.id, e.target.value as Role)}
                        className="rounded-md border border-border bg-canvas px-2 py-1.5 text-sm text-ink"
                      >
                        {ROLE_ORDER.map((option) => <option key={option} value={option}>{capitalize(option)}</option>)}
                      </select>
                    ) : <RoleBadge role={user.role} />}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{user.last_sign_in_at ? timeAgo(user.last_sign_in_at) : 'Never'}</td>
                  <td className="px-4 py-3 text-ink-muted">{Number(user.message_count).toLocaleString()} msgs · {Number(user.connection_count).toLocaleString()} contacts</td>
                  <td className="px-4 py-3 text-ink-muted">{Number(user.report_count).toLocaleString()} total{Number(user.open_report_count) > 0 && <div className="text-xs font-medium text-ink">{Number(user.open_report_count).toLocaleString()} open</div>}</td>
                  <td className="px-4 py-3 text-ink-muted">{new Date(user.created_at).toLocaleDateString()}</td>
                  {role === 'owner' && (
                    <td className="px-4 py-3">
                      {protectedAccount ? <span className="text-xs text-ink-faint">Protected</span> : (
                        <div className="flex min-w-48 flex-wrap gap-2">
                          <OwnerButton disabled={busyUser === user.id} onClick={() => void onToggleBan(user)}>{user.banned_at ? 'Unban' : 'Ban'}</OwnerButton>
                          <OwnerButton disabled={busyUser === user.id} onClick={() => void onForceSignOut(user)}>Sign out</OwnerButton>
                          <OwnerButton disabled={busyUser === user.id} onClick={() => void onRemoveUser(user)}>Remove</OwnerButton>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ReportsSection({
  reports,
  busyReport,
  role,
  onUpdate,
}: {
  reports: ReportRow[];
  busyReport: string | null;
  role: StaffRole;
  onUpdate: (report: ReportRow, status: ReportRow['status']) => Promise<void>;
}) {
  const openCount = reports.filter((report) => report.status === 'submitted' || report.status === 'reviewing').length;
  const reviewingCount = reports.filter((report) => report.status === 'reviewing').length;
  const resolvedCount = reports.filter((report) => report.status === 'resolved').length;

  return (
    <section className="mt-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Open" value={openCount} />
        <MiniStat label="Reviewing" value={reviewingCount} />
        <MiniStat label="Resolved" value={resolvedCount} />
      </div>

      <div className="mb-4 mt-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-ink-faint" /><h2 className="text-lg font-semibold text-ink">Moderation queue</h2></div>
          <p className="mt-1 text-sm text-ink-muted">Review reported users and messages, then resolve, dismiss, or reopen cases.</p>
        </div>
      </div>

      <div className="space-y-3">
        {reports.length === 0 && <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center text-sm text-ink-muted">No reports yet.</div>}
        {reports.map((report) => {
          const closed = report.status === 'resolved' || report.status === 'dismissed';
          return (
            <article key={report.report_id} className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={report.status} />
                    <span className="text-sm font-medium text-ink">{humanReason(report.reason)}</span>
                    <span className="text-xs text-ink-faint">{timeAgo(report.created_at)}</span>
                  </div>
                  <div className="mt-3 text-sm text-ink">
                    Reported: <strong>{report.reported_name ?? 'Removed account'}</strong>
                    {report.reported_relay_number && <span className="text-ink-muted"> · {formatRelay(report.reported_relay_number)}</span>}
                    {role !== 'moderator' && report.reported_email && <span className="text-ink-muted"> · {report.reported_email}</span>}
                  </div>
                  <div className="mt-1 text-xs text-ink-muted">Reported by {report.reporter_name} · {formatRelay(report.reporter_relay_number)}</div>
                  {report.details && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{report.details}</p>}
                  {report.message_body && <div className="mt-3 rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink-muted">Reported message: “{truncate(report.message_body, 220)}”</div>}
                  {report.moderation_note && <div className="mt-3 text-xs text-ink-muted">Staff note: {report.moderation_note}{report.resolved_by_name ? ` · ${report.resolved_by_name}` : ''}</div>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {closed ? (
                    <OwnerButton disabled={busyReport === report.report_id} onClick={() => void onUpdate(report, 'submitted')}>Reopen</OwnerButton>
                  ) : (
                    <>
                      {report.status !== 'reviewing' && <OwnerButton disabled={busyReport === report.report_id} onClick={() => void onUpdate(report, 'reviewing')}>Review</OwnerButton>}
                      <OwnerButton disabled={busyReport === report.report_id} onClick={() => void onUpdate(report, 'resolved')}>Resolve</OwnerButton>
                      <OwnerButton disabled={busyReport === report.report_id} onClick={() => void onUpdate(report, 'dismissed')}>Dismiss</OwnerButton>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function OwnerAnalytics({ stats }: { stats: Stats }) {
  const storageBytes = Number(stats.storage.bytes_total ?? 0);
  const sections: { title: string; items: [string, string | number][] }[] = [
    { title: 'Users', items: [['Relay users', stats.users.total], ['Auth accounts', stats.users.auth_accounts], ['Primary emails', stats.users.primary_email_accounts], ['Gmail links', stats.users.gmail_integrations], ['Calendar links', stats.users.calendar_integrations], ['Active 24h', stats.users.active_24h], ['Active 7d', stats.users.active_7d], ['Active 30d', stats.users.active_30d], ['New 24h', stats.users.new_24h], ['New 7d', stats.users.new_7d], ['New 30d', stats.users.new_30d], ['Moderators', stats.users.moderators], ['Admins', stats.users.admins], ['Owners', stats.users.owners]] },
    { title: 'Messaging', items: [['Messages', stats.messaging.messages_total], ['Messages 24h', stats.messaging.messages_24h], ['Messages 7d', stats.messaging.messages_7d], ['Conversations', stats.messaging.conversations_total], ['Direct chats', stats.messaging.direct_conversations], ['Group chats', stats.messaging.group_conversations], ['Groups', stats.messaging.groups_total], ['Connections', stats.messaging.connections_total], ['Pending requests', stats.messaging.pending_connection_requests]] },
    { title: 'Engagement', items: [['Notifications', stats.engagement.notifications_total], ['Unread notifications', stats.engagement.notifications_unread], ['Push devices', stats.engagement.push_enabled_devices], ['Users with push', stats.engagement.users_with_push], ['Number lookups 24h', stats.engagement.relay_number_lookups_24h]] },
    { title: 'Storage', items: [['Storage used', formatBytes(storageBytes)], ['Stored objects', stats.storage.objects_total], ['Buckets in use', stats.storage.buckets_used]] },
  ];

  return (
    <section className="mt-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><BarChart3 size={17} className="text-ink-faint" /><h2 className="text-lg font-semibold text-ink">Analytics</h2></div>
          <p className="mt-1 text-sm text-ink-muted">The detailed numbers live here now instead of crowding the Control Center overview.</p>
        </div>
        <span className="text-xs text-ink-faint">Updated {new Date(stats.generated_at).toLocaleTimeString()}</span>
      </div>
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">{section.title}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {section.items.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border bg-surface p-4">
                <div className="text-xl font-semibold tracking-tight text-ink">{typeof value === 'number' ? Number(value ?? 0).toLocaleString() : value}</div>
                <div className="mt-1 text-xs text-ink-muted">{label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function SystemSnapshot({ stats }: { stats: Stats }) {
  const storageBytes = Number(stats.storage.bytes_total ?? 0);
  const cards = [
    ['Storage used', formatBytes(storageBytes), 'Across Relay storage buckets'],
    ['Stored objects', Number(stats.storage.objects_total ?? 0).toLocaleString(), 'Files currently tracked'],
    ['Buckets in use', Number(stats.storage.buckets_used ?? 0).toLocaleString(), 'Storage buckets with data'],
    ['Auth accounts', Number(stats.users.auth_accounts ?? 0).toLocaleString(), 'Authentication accounts'],
  ];

  return (
    <section className="mt-6">
      <div>
        <div className="flex items-center gap-2"><Database size={17} className="text-ink-faint" /><h2 className="text-lg font-semibold text-ink">System</h2></div>
        <p className="mt-1 text-sm text-ink-muted">Operational data we can verify from Relay right now. Service health indicators can plug into this section later when live health checks are available.</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, note]) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-4">
            <div className="text-xs font-medium text-ink-faint">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-ink">{value}</div>
            <div className="mt-1 text-xs text-ink-muted">{note}</div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Snapshot freshness</div>
        <div className="mt-2 text-sm font-medium text-ink">Generated {new Date(stats.generated_at).toLocaleString()}</div>
        <p className="mt-1 text-xs leading-5 text-ink-muted">This section intentionally avoids pretending a service is healthy until Relay has a real check for it.</p>
      </div>
    </section>
  );
}

function AuditSection({ rows }: { rows: AuditRow[] }) {
  return (
    <section className="mt-6">
      <div className="mb-4">
        <div className="flex items-center gap-2"><Activity size={17} className="text-ink-faint" /><h2 className="text-lg font-semibold text-ink">Staff activity</h2></div>
        <p className="mt-1 text-sm text-ink-muted">Recent role changes, report decisions, bans, sign-outs, and removals.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        {rows.length === 0 ? <div className="p-5 text-sm text-ink-muted">No staff actions recorded yet.</div> : rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-ink"><strong>{row.actor_name ?? 'Deleted staff account'}</strong> · {humanAction(row.action)} · <span className="text-ink-muted">{row.target_name ?? auditTarget(row)}</span></div>
            <div className="text-xs text-ink-faint">{new Date(row.created_at).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-border bg-surface px-4 py-3"><div className="text-xs text-ink-faint">{label}</div><div className="mt-1 text-2xl font-semibold text-ink">{value.toLocaleString()}</div></div>;
}

function OwnerButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-45">{children}</button>;
}

function StatusBadge({ status }: { status: ReportRow['status'] }) {
  return <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">{status}</span>;
}

function RoleBadge({ role }: { role: Role }) {
  const mark = role === 'owner' ? '◆' : role === 'admin' ? '◇' : role === 'moderator' ? '●' : '';
  return <span className="rounded-full border border-border px-2 py-1 text-xs font-medium text-ink">{mark ? `${mark} ` : ''}{capitalize(role)}</span>;
}

function allowedSection(role: StaffRole, requested: StaffSection): StaffSection {
  const allowed = role === 'owner' ? OWNER_SECTIONS : role === 'admin' ? ADMIN_SECTIONS : MODERATOR_SECTIONS;
  return allowed.includes(requested) ? requested : 'overview';
}

function auditTarget(row: AuditRow) {
  const metadata = row.metadata ?? {};
  if (typeof metadata.display_name === 'string') return metadata.display_name;
  if (typeof metadata.target_id === 'string') return metadata.target_id;
  return '—';
}

function isStaffRole(role: Role): role is StaffRole { return role === 'moderator' || role === 'admin' || role === 'owner'; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function humanReason(value: string) { return value.split('_').map(capitalize).join(' '); }
function humanAction(value: string) { return value.split('_').map(capitalize).join(' '); }
function formatRelay(value: string) { return value?.length === 7 ? `${value.slice(0, 3)}-${value.slice(3)}` : value; }
function truncate(value: string, max: number) { return value.length <= max ? value : `${value.slice(0, max - 1)}…`; }
function formatBytes(bytes: number) { if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'; const units = ['B', 'KB', 'MB', 'GB', 'TB']; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`; }
function timeAgo(value: string) { const diff = Date.now() - new Date(value).getTime(); const minutes = Math.max(0, Math.floor(diff / 60000)); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }
