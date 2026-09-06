'use client';

import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { AppRole, getRolePreview, ROLE_PREVIEW_EVENT } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useMemo, useState } from 'react';

type Role = AppRole;
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

  const role = actualRole === 'owner' ? previewRole : actualRole;

  async function load() {
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
    void load().catch((e: any) => setError(e?.message ?? 'Staff console could not load.'));

    const onPreviewChange = (event: Event) => {
      const nextRole = (event as CustomEvent<Role>).detail;
      setPreviewRole(nextRole);
      setStats(null);
      setUsers([]);
      setReports([]);
      setAuditLog([]);
      void load().catch((e: any) => setError(e?.message ?? 'Staff console could not load.'));
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
        <PageHeader title="Staff" />
        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-ink">You do not have access to this area.</p>
          <p className="mt-1 text-sm text-ink-muted">Moderator, admin, or owner permission is required.</p>
        </div>
      </div>
    );
  }

  const pageTitle = role === 'owner' ? 'Owner Console' : role === 'admin' ? 'Admin Console' : 'Moderator Console';

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <PageHeader title={pageTitle} />

      <div className="mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-ink-muted">
        {role === 'moderator'
          ? 'Moderators review user reports and flagged messages. Account access, roles, bans, and removals stay locked to higher staff levels.'
          : role === 'admin'
            ? 'Admins can review reports and inspect the account directory. Owner-only actions remain protected.'
            : 'Owner mode includes moderation, account controls, live stats, role management, and the staff audit trail.'}
      </div>

      {error && <div className="mt-5 rounded-lg border border-border bg-surface p-4 text-sm text-ink">{error}</div>}

      {role === 'owner' && stats && <OwnerStats stats={stats} />}

      <ReportsSection reports={reports} busyReport={busyReport} role={role} onUpdate={updateReport} />

      {(role === 'admin' || role === 'owner') && (
        <section className="mt-8">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">Accounts</h2>
              <p className="text-sm text-ink-muted">{users.length} Relay accounts. Owner actions are intentionally separate from role changes.</p>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search accounts or emails"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none sm:w-72"
            />
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-ink-faint">
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
                    <tr key={user.id}>
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
                        ) : (
                          <span className="rounded-full border border-border px-2 py-1 text-xs font-medium text-ink-muted">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {role === 'owner' ? (
                          <select
                            value={user.role}
                            disabled={busyUser === user.id || user.id === currentUserId}
                            onChange={(e) => void changeRole(user.id, e.target.value as Role)}
                            className="rounded-md border border-border bg-canvas px-2 py-1.5 text-sm text-ink"
                          >
                            {ROLE_ORDER.map((option) => <option key={option} value={option}>{capitalize(option)}</option>)}
                          </select>
                        ) : <RoleBadge role={user.role} />}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{user.last_sign_in_at ? timeAgo(user.last_sign_in_at) : 'Never'}</td>
                      <td className="px-4 py-3 text-ink-muted">{Number(user.message_count).toLocaleString()} msgs · {Number(user.connection_count).toLocaleString()} contacts</td>
                      <td className="px-4 py-3 text-ink-muted">
                        {Number(user.report_count).toLocaleString()} total
                        {Number(user.open_report_count) > 0 && <div className="text-xs font-medium text-ink">{Number(user.open_report_count).toLocaleString()} open</div>}
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{new Date(user.created_at).toLocaleDateString()}</td>
                      {role === 'owner' && (
                        <td className="px-4 py-3">
                          {protectedAccount ? (
                            <span className="text-xs text-ink-faint">Protected</span>
                          ) : (
                            <div className="flex min-w-48 flex-wrap gap-2">
                              <OwnerButton disabled={busyUser === user.id} onClick={() => void toggleBan(user)}>
                                {user.banned_at ? 'Unban' : 'Ban'}
                              </OwnerButton>
                              <OwnerButton disabled={busyUser === user.id} onClick={() => void forceSignOut(user)}>Sign out</OwnerButton>
                              <OwnerButton disabled={busyUser === user.id} onClick={() => void removeUser(user)}>Remove</OwnerButton>
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
      )}

      {role === 'owner' && <AuditSection rows={auditLog} />}
    </div>
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
  role: Role;
  onUpdate: (report: ReportRow, status: ReportRow['status']) => Promise<void>;
}) {
  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">Moderation queue</h2>
        <p className="text-sm text-ink-muted">{reports.filter((report) => report.status === 'submitted' || report.status === 'reviewing').length} open · {reports.length} loaded</p>
      </div>

      <div className="space-y-3">
        {reports.length === 0 && (
          <div className="rounded-xl border border-border bg-surface p-5 text-sm text-ink-muted">No reports yet.</div>
        )}
        {reports.map((report) => {
          const closed = report.status === 'resolved' || report.status === 'dismissed';
          return (
            <article key={report.report_id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
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
                  {report.details && <p className="mt-3 whitespace-pre-wrap text-sm text-ink-muted">{report.details}</p>}
                  {report.message_body && (
                    <div className="mt-3 rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink-muted">
                      Reported message: “{truncate(report.message_body, 220)}”
                    </div>
                  )}
                  {report.moderation_note && (
                    <div className="mt-3 text-xs text-ink-muted">Staff note: {report.moderation_note}{report.resolved_by_name ? ` · ${report.resolved_by_name}` : ''}</div>
                  )}
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

function OwnerStats({ stats }: { stats: Stats }) {
  const storageBytes = Number(stats.storage.bytes_total ?? 0);
  const sections = [
    { title: 'Users', items: [['Relay users', stats.users.total], ['Auth accounts', stats.users.auth_accounts], ['Primary emails', stats.users.primary_email_accounts], ['Gmail links', stats.users.gmail_integrations], ['Calendar links', stats.users.calendar_integrations], ['Active 24h', stats.users.active_24h], ['Active 7d', stats.users.active_7d], ['Active 30d', stats.users.active_30d], ['New 24h', stats.users.new_24h], ['New 7d', stats.users.new_7d], ['New 30d', stats.users.new_30d], ['Moderators', stats.users.moderators], ['Admins', stats.users.admins], ['Owners', stats.users.owners]] },
    { title: 'Messaging', items: [['Messages', stats.messaging.messages_total], ['Messages 24h', stats.messaging.messages_24h], ['Messages 7d', stats.messaging.messages_7d], ['Conversations', stats.messaging.conversations_total], ['Direct chats', stats.messaging.direct_conversations], ['Group chats', stats.messaging.group_conversations], ['Groups', stats.messaging.groups_total], ['Connections', stats.messaging.connections_total], ['Pending requests', stats.messaging.pending_connection_requests]] },
    { title: 'Engagement', items: [['Notifications', stats.engagement.notifications_total], ['Unread notifications', stats.engagement.notifications_unread], ['Push devices', stats.engagement.push_enabled_devices], ['Users with push', stats.engagement.users_with_push], ['Number lookups 24h', stats.engagement.relay_number_lookups_24h]] },
    { title: 'Storage', items: [['Storage used', formatBytes(storageBytes)], ['Stored objects', stats.storage.objects_total], ['Buckets in use', stats.storage.buckets_used]] },
  ];

  return (
    <section className="mt-6 space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <div><h2 className="text-lg font-semibold text-ink">Relay at a glance</h2><p className="text-sm text-ink-muted">Live aggregate operational stats. Private message contents are not exposed here.</p></div>
        <span className="hidden text-xs text-ink-faint sm:block">Updated {new Date(stats.generated_at).toLocaleTimeString()}</span>
      </div>
      {sections.map((section) => (
        <div key={section.title}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">{section.title}</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {section.items.map(([label, value]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-surface p-4">
                <div className="text-xl font-semibold tracking-tight text-ink">{typeof value === 'number' ? value.toLocaleString() : value}</div>
                <div className="mt-1 text-xs text-ink-muted">{label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function AuditSection({ rows }: { rows: AuditRow[] }) {
  return (
    <section className="mt-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-ink">Staff audit trail</h2>
        <p className="text-sm text-ink-muted">Recent role changes, report decisions, bans, sign-outs, and removals.</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        {rows.length === 0 ? (
          <div className="p-5 text-sm text-ink-muted">No staff actions recorded yet.</div>
        ) : rows.map((row) => {
          const metadata = row.metadata ?? {};
          const targetFallback = typeof metadata.display_name === 'string' ? metadata.display_name : typeof metadata.target_id === 'string' ? metadata.target_id : '—';
          return (
            <div key={row.id} className="flex flex-col gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-ink">
                <strong>{row.actor_name ?? 'Deleted staff account'}</strong> · {humanAction(row.action)} · <span className="text-ink-muted">{row.target_name ?? targetFallback}</span>
              </div>
              <div className="text-xs text-ink-faint">{new Date(row.created_at).toLocaleString()}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OwnerButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-45">{children}</button>;
}

function StatusBadge({ status }: { status: ReportRow['status'] }) {
  return <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">{status}</span>;
}

function RoleBadge({ role }: { role: Role }) { return <span className="rounded-full border border-border px-2 py-1 text-xs font-medium text-ink">{capitalize(role)}</span>; }
function isStaffRole(role: Role) { return role === 'moderator' || role === 'admin' || role === 'owner'; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function humanReason(value: string) { return value.split('_').map(capitalize).join(' '); }
function humanAction(value: string) { return value.split('_').map(capitalize).join(' '); }
function formatRelay(value: string) { return value?.length === 7 ? `${value.slice(0, 3)}-${value.slice(3)}` : value; }
function truncate(value: string, max: number) { return value.length <= max ? value : `${value.slice(0, max - 1)}…`; }
function formatBytes(bytes: number) { if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'; const units = ['B', 'KB', 'MB', 'GB', 'TB']; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`; }
function timeAgo(value: string) { const diff = Date.now() - new Date(value).getTime(); const minutes = Math.max(0, Math.floor(diff / 60000)); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }
