'use client';

import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useMemo, useState } from 'react';

type Role = 'user' | 'moderator' | 'admin' | 'owner';
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
  const [role, setRole] = useState<Role | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    const currentRole = (profile?.role ?? 'user') as Role;
    setRole(currentRole);

    if (currentRole !== 'admin' && currentRole !== 'owner') return;

    const userResult = await supabase.rpc('admin_list_users', { p_limit: 250, p_offset: 0 });
    if (userResult.error) throw userResult.error;
    setUsers((userResult.data ?? []) as UserRow[]);

    if (currentRole === 'owner') {
      const statsResult = await supabase.rpc('owner_dashboard_stats');
      if (statsResult.error) throw statsResult.error;
      setStats(statsResult.data as Stats);
    }
  }

  useEffect(() => {
    void load().catch((e: any) => setError(e?.message ?? 'Admin dashboard could not load.'));
  }, []);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) =>
      [user.display_name, user.primary_email, user.relay_number, user.school, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [query, users]);

  async function changeRole(userId: string, nextRole: Role) {
    setBusyUser(userId);
    setError(null);
    const supabase = createClient();
    const { error: roleError } = await supabase.rpc('set_user_role', {
      p_user_id: userId,
      p_role: nextRole,
    });
    if (roleError) {
      setError(roleError.message);
    } else {
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, role: nextRole } : user));
      const statsResult = await supabase.rpc('owner_dashboard_stats');
      if (!statsResult.error) setStats(statsResult.data as Stats);
    }
    setBusyUser(null);
  }

  if (role === null && !error) return <PageLoading />;

  if (role !== 'admin' && role !== 'owner') {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <PageHeader title="Admin" />
        <div className="mt-6 rounded-xl border border-border bg-surface p-6">
          <p className="text-sm font-medium text-ink">You do not have access to this area.</p>
          <p className="mt-1 text-sm text-ink-muted">Admin or owner permission is required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
      <PageHeader title={role === 'owner' ? 'Owner Console' : 'Admin Console'} />

      {error && <div className="mt-5 rounded-lg border border-border bg-surface p-4 text-sm text-ink">{error}</div>}

      {role === 'owner' && stats && <OwnerStats stats={stats} />}

      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Accounts</h2>
            <p className="text-sm text-ink-muted">{users.length} Relay accounts. Linked Gmail is shown separately from unique users.</p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search accounts"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none sm:w-72"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Activity</th>
                <th className="px-4 py-3 font-medium">Usage</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{user.display_name}</div>
                    <div className="text-xs text-ink-muted">{user.primary_email ?? 'No primary email'} · {formatRelay(user.relay_number)}</div>
                    {user.gmail_connected && <div className="mt-1 text-xs text-ink-faint">Gmail linked</div>}
                  </td>
                  <td className="px-4 py-3">
                    {role === 'owner' ? (
                      <select
                        value={user.role}
                        disabled={busyUser === user.id}
                        onChange={(e) => void changeRole(user.id, e.target.value as Role)}
                        className="rounded-md border border-border bg-canvas px-2 py-1.5 text-sm text-ink"
                      >
                        {ROLE_ORDER.map((option) => <option key={option} value={option}>{capitalize(option)}</option>)}
                      </select>
                    ) : <RoleBadge role={user.role} />}
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{user.last_sign_in_at ? timeAgo(user.last_sign_in_at) : 'Never'}</td>
                  <td className="px-4 py-3 text-ink-muted">{Number(user.message_count).toLocaleString()} msgs · {Number(user.connection_count).toLocaleString()} contacts</td>
                  <td className="px-4 py-3 text-ink-muted">{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OwnerStats({ stats }: { stats: Stats }) {
  const storageBytes = Number(stats.storage.bytes_total ?? 0);
  const sections = [
    {
      title: 'Users',
      items: [
        ['Relay users', stats.users.total],
        ['Auth accounts', stats.users.auth_accounts],
        ['Primary emails', stats.users.primary_email_accounts],
        ['Gmail links', stats.users.gmail_integrations],
        ['Calendar links', stats.users.calendar_integrations],
        ['Active 24h', stats.users.active_24h],
        ['Active 7d', stats.users.active_7d],
        ['Active 30d', stats.users.active_30d],
        ['New 24h', stats.users.new_24h],
        ['New 7d', stats.users.new_7d],
        ['New 30d', stats.users.new_30d],
        ['Moderators', stats.users.moderators],
        ['Admins', stats.users.admins],
        ['Owners', stats.users.owners],
      ],
    },
    {
      title: 'Messaging',
      items: [
        ['Messages', stats.messaging.messages_total],
        ['Messages 24h', stats.messaging.messages_24h],
        ['Messages 7d', stats.messaging.messages_7d],
        ['Conversations', stats.messaging.conversations_total],
        ['Direct chats', stats.messaging.direct_conversations],
        ['Group chats', stats.messaging.group_conversations],
        ['Groups', stats.messaging.groups_total],
        ['Connections', stats.messaging.connections_total],
        ['Pending requests', stats.messaging.pending_connection_requests],
      ],
    },
    {
      title: 'Engagement',
      items: [
        ['Notifications', stats.engagement.notifications_total],
        ['Unread notifications', stats.engagement.notifications_unread],
        ['Push devices', stats.engagement.push_enabled_devices],
        ['Users with push', stats.engagement.users_with_push],
        ['Number lookups 24h', stats.engagement.relay_number_lookups_24h],
      ],
    },
    {
      title: 'Storage',
      items: [
        ['Storage used', formatBytes(storageBytes)],
        ['Stored objects', stats.storage.objects_total],
        ['Buckets in use', stats.storage.buckets_used],
      ],
    },
  ];

  return (
    <section className="mt-6 space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Relay at a glance</h2>
          <p className="text-sm text-ink-muted">Live aggregate operational stats. Private message contents are not exposed here.</p>
        </div>
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

function RoleBadge({ role }: { role: Role }) {
  return <span className="rounded-full border border-border px-2 py-1 text-xs font-medium text-ink">{capitalize(role)}</span>;
}

function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function formatRelay(value: string) { return value?.length === 7 ? `${value.slice(0, 3)}-${value.slice(3)}` : value; }
function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}
function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
