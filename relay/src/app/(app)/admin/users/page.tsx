'use client';

import { PageLoading } from '@/components/page-loading';
import { StaffControlHeader } from '@/components/staff-control-header';
import { OwnerUserInspector } from '@/components/staff/owner-user-inspector';
import { AppRole, getRolePreview } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { FlaskConical, Search, UserRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type UserRow = {
  id: string;
  display_name: string;
  relay_number: string;
  school: string | null;
  role: AppRole;
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

type BetaTesterRow = {
  user_id: string;
  display_name: string;
  username: string | null;
  relay_number: string;
  primary_email: string | null;
  role: AppRole;
  approved_at: string;
  approved_by_name: string | null;
};

type DirectoryMode = 'all' | 'beta';

export default function StaffUsersPage() {
  const [actualRole, setActualRole] = useState<AppRole | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [betaTesters, setBetaTesters] = useState<BetaTesterRow[]>([]);
  const [directoryMode, setDirectoryMode] = useState<DirectoryMode>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (preferredId?: string | null, mode: DirectoryMode = 'all') => {
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profileError) throw profileError;
    const nextActual = (profile?.role ?? 'user') as AppRole;
    const nextRole = nextActual === 'owner' ? getRolePreview(nextActual) : nextActual;
    setActualRole(nextActual);
    setRole(nextRole);
    if (nextRole !== 'admin' && nextRole !== 'owner') {
      setUsers([]);
      setBetaTesters([]);
      return;
    }

    const [{ data: userData, error: usersError }, { data: betaData, error: betaError }] = await Promise.all([
      supabase.rpc('admin_list_users_v2', { p_limit: 250, p_offset: 0 }),
      supabase.rpc('admin_list_beta_testers', { p_limit: 250, p_offset: 0 }),
    ]);
    if (usersError) throw usersError;
    if (betaError) throw betaError;

    const rows = (userData ?? []) as UserRow[];
    const betaRows = (betaData ?? []) as BetaTesterRow[];
    setUsers(rows);
    setBetaTesters(betaRows);

    const visibleIds = mode === 'beta' ? new Set(betaRows.map((row) => row.user_id)) : null;
    const available = visibleIds ? rows.filter((row) => visibleIds.has(row.id)) : rows;
    const target = preferredId && available.some((row) => row.id === preferredId) ? preferredId : available[0]?.id ?? null;
    setSelectedId((current) => current && available.some((row) => row.id === current) ? current : target);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void load(null, 'all').catch((e: any) => setError(e?.message ?? 'User inspector could not load.'));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const betaByUserId = useMemo(() => new Map(betaTesters.map((row) => [row.user_id, row])), [betaTesters]);
  const directoryUsers = useMemo(() => directoryMode === 'beta' ? users.filter((user) => betaByUserId.has(user.id)) : users, [directoryMode, users, betaByUserId]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return directoryUsers;
    return directoryUsers.filter((user) => {
      const beta = betaByUserId.get(user.id);
      return [user.display_name, user.primary_email, user.relay_number, user.school, user.role, beta?.username].filter(Boolean).some((value) => String(value).toLowerCase().includes(q));
    });
  }, [query, directoryUsers, betaByUserId]);

  const selected = users.find((user) => user.id === selectedId) ?? null;
  const selectedBeta = selected ? betaByUserId.get(selected.id) ?? null : null;

  function switchDirectory(next: DirectoryMode) {
    setDirectoryMode(next);
    setQuery('');
    const nextRows = next === 'beta' ? users.filter((user) => betaByUserId.has(user.id)) : users;
    setSelectedId(nextRows[0]?.id ?? null);
  }

  async function changeRole(nextRole: AppRole) {
    if (role !== 'owner' || !selected || selected.id === currentUserId) return;
    setError(null);
    setBusy(true);
    const { error: actionError } = await (createClient() as any).rpc('set_user_role', { p_user_id: selected.id, p_role: nextRole });
    if (actionError) setError(actionError.message); else await load(selected.id, directoryMode);
    setBusy(false);
  }

  async function toggleBan() {
    if (role !== 'owner' || !selected || selected.role === 'owner' || selected.id === currentUserId) return;
    const banning = !selected.banned_at;
    let reason: string | null = null;
    if (banning) {
      reason = window.prompt(`Optional reason for banning ${selected.display_name}:`, '') ?? null;
      if (reason === null) return;
    } else if (!window.confirm(`Unban ${selected.display_name}?`)) return;
    setError(null);
    setBusy(true);
    const { error: actionError } = await (createClient() as any).rpc('owner_set_user_ban', { p_user_id: selected.id, p_banned: banning, p_reason: reason || null });
    if (actionError) setError(actionError.message); else await load(selected.id, directoryMode);
    setBusy(false);
  }

  async function forceSignOut() {
    if (role !== 'owner' || !selected || selected.role === 'owner' || selected.id === currentUserId) return;
    if (!window.confirm(`Force ${selected.display_name} to sign out on all devices?`)) return;
    setError(null);
    setBusy(true);
    const { error: actionError } = await (createClient() as any).rpc('owner_force_sign_out', { p_user_id: selected.id });
    if (actionError) setError(actionError.message); else await load(selected.id, directoryMode);
    setBusy(false);
  }

  async function removeUser() {
    if (role !== 'owner' || !selected || selected.role === 'owner' || selected.id === currentUserId) return;
    const confirmation = window.prompt(`Permanently remove ${selected.display_name} and their Relay data? Type REMOVE to confirm.`);
    if (confirmation !== 'REMOVE') return;
    setError(null);
    setBusy(true);
    const { error: actionError } = await (createClient() as any).rpc('owner_delete_user', { p_user_id: selected.id });
    if (actionError) setError(actionError.message); else await load(null, directoryMode);
    setBusy(false);
  }

  async function revokeBeta() {
    if (role !== 'owner' || !selected || !selectedBeta || selected.role === 'owner') return;
    const message = window.prompt(`Revoke Beta access for ${selected.display_name}? Add an optional message for the audit trail:`, '');
    if (message === null) return;
    setError(null);
    setBusy(true);
    const { error: actionError } = await (createClient() as any).rpc('owner_revoke_beta_access', { p_user_id: selected.id, p_message: message.trim() || null });
    if (actionError) setError(actionError.message); else await load(null, directoryMode);
    setBusy(false);
  }

  if (actualRole === null && !error) return <PageLoading />;
  if (role !== 'admin' && role !== 'owner') {
    return <div className="mx-auto max-w-4xl px-4 py-8 md:px-6"><div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-muted">Admin or Owner view is required for Users.</div></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-8">
      <StaffControlHeader role={role} active="users" />
      {error && <div className="mt-5 rounded-xl border border-border bg-surface p-4 text-sm text-ink">{error}</div>}

      <div className="mt-6 grid min-h-[560px] gap-4 lg:grid-cols-[minmax(300px,.72fr)_minmax(0,1.28fr)]">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border p-4">
            <div className="text-sm font-semibold text-ink">Account directory</div>
            <div className="mt-1 text-xs text-ink-muted">{users.length} Relay accounts · {betaTesters.length} approved Beta testers.</div>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-lg border border-border bg-canvas p-1">
              <button type="button" onClick={() => switchDirectory('all')} className={`rounded-md px-3 py-2 text-xs font-medium ${directoryMode === 'all' ? 'bg-ink text-canvas' : 'text-ink-muted hover:bg-surface-raised'}`}>All Users <span className="ml-1 opacity-70">{users.length}</span></button>
              <button type="button" onClick={() => switchDirectory('beta')} className={`rounded-md px-3 py-2 text-xs font-medium ${directoryMode === 'beta' ? 'bg-ink text-canvas' : 'text-ink-muted hover:bg-surface-raised'}`}>Beta Testers <span className="ml-1 opacity-70">{betaTesters.length}</span></button>
            </div>
            <label className="mt-3 flex min-h-11 items-center gap-2 rounded-lg border border-border bg-canvas px-3"><Search size={14} className="text-ink-faint" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={directoryMode === 'beta' ? 'Search Beta testers…' : 'Search name, email, Relay…'} className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" /></label>
          </div>
          <div className="max-h-[680px] overflow-y-auto p-2">
            {filtered.map((user) => {
              const beta = betaByUserId.get(user.id);
              return (
                <button key={user.id} type="button" onClick={() => setSelectedId(user.id)} className={`block min-h-16 w-full rounded-xl px-3 py-3 text-left transition-colors ${selectedId === user.id ? 'bg-surface-raised' : 'hover:bg-canvas'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><div className="truncate text-sm font-medium text-ink">{user.display_name}</div><div className="mt-0.5 truncate text-xs text-ink-muted">{user.primary_email ?? formatRelay(user.relay_number)}</div></div>
                    <div className="flex items-center gap-1.5">{beta && <span title="Approved Beta tester" className="flex h-6 w-6 items-center justify-center rounded-full border border-border text-ink-muted"><FlaskConical size={12} /></span>}<RoleBadge role={user.role} /></div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-ink-faint"><span>{user.banned_at ? 'Banned' : 'Active'}</span><span>·</span><span>{user.last_sign_in_at ? timeAgo(user.last_sign_in_at) : 'Never signed in'}</span>{directoryMode === 'beta' && beta && <><span>·</span><span>Beta since {new Date(beta.approved_at).toLocaleDateString()}</span></>}</div>
                </button>
              );
            })}
            {filtered.length === 0 && <div className="px-4 py-8 text-center text-xs text-ink-muted">{directoryMode === 'beta' ? 'No approved Beta testers match that search.' : 'No accounts match that search.'}</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          {!selected ? (
            <div className="flex min-h-80 items-center justify-center text-sm text-ink-muted">Select an account to inspect.</div>
          ) : (
            <div key={selected.id} className="relay-motion-crossfade">
              {selectedBeta && (
                <div className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-canvas p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div><div className="flex items-center gap-2 text-sm font-semibold text-ink"><FlaskConical size={14} />Approved Beta tester</div><div className="mt-1 text-xs text-ink-muted">Approved {new Date(selectedBeta.approved_at).toLocaleString()}{selectedBeta.approved_by_name ? ` by ${selectedBeta.approved_by_name}` : ''}.</div></div>
                  {role === 'owner' && selected.role !== 'owner' && <button type="button" disabled={busy} onClick={() => void revokeBeta()} className="min-h-10 shrink-0 rounded-md border border-border px-3 text-xs font-medium text-ink hover:bg-surface-raised disabled:opacity-50">Revoke Beta access</button>}
                </div>
              )}
              {role === 'owner' ? (
                <OwnerUserInspector user={selected} currentUserId={currentUserId} busy={busy} onSelectUser={(id) => setSelectedId(id)} onRoleChange={(nextRole) => void changeRole(nextRole)} onToggleBan={() => void toggleBan()} onForceSignOut={() => void forceSignOut()} onDeleteUser={() => void removeUser()} />
              ) : (
                <AdminUserInspector user={selected} />
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AdminUserInspector({ user }: { user: UserRow }) {
  return (
    <>
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-canvas text-ink-muted"><UserRound size={18} /></span><div><div className="text-xl font-semibold text-ink">{user.display_name}</div><div className="mt-1 text-xs text-ink-muted">{user.primary_email ?? 'No primary email'} · {formatRelay(user.relay_number)}</div>{user.school && <div className="mt-1 text-xs text-ink-faint">{user.school}</div>}</div></div>
        <div className="flex items-center gap-2"><RoleBadge role={user.role} /><span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${user.banned_at ? 'border-ink text-ink' : 'border-border text-ink-muted'}`}>{user.banned_at ? 'Banned' : 'Active'}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-4"><InspectorMetric label="Messages" value={user.message_count} /><InspectorMetric label="Contacts" value={user.connection_count} /><InspectorMetric label="Reports" value={user.report_count} /><InspectorMetric label="Open reports" value={user.open_report_count} /></div>
      <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2"><InfoLine label="Last active" value={user.last_sign_in_at ? timeAgo(user.last_sign_in_at) : 'Never'} /><InfoLine label="Joined" value={new Date(user.created_at).toLocaleDateString()} /><InfoLine label="Gmail" value={user.gmail_connected ? 'Connected' : 'Not connected'} /><InfoLine label="Account ID" value={user.id.slice(0, 8) + '…'} mono /></div>
      {user.banned_at && <div className="mt-5 rounded-xl border border-border bg-canvas p-4 text-sm text-ink-muted"><div className="font-medium text-ink">Account disabled</div><div className="mt-1 text-xs">{user.ban_reason || 'No ban reason recorded.'}</div></div>}
      <div className="mt-6 rounded-xl border border-border bg-canvas p-4 text-xs leading-5 text-ink-muted">Admin has operational account visibility and moderation context. Contacts, groups, conversation metadata, storage attribution, sessions, Owner notes, and destructive account controls are reserved for Owner.</div>
    </>
  );
}

function RoleBadge({ role }: { role: AppRole }) { return <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-muted">{role}</span>; }
function InspectorMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-border bg-canvas p-3"><div className="text-xl font-semibold text-ink">{Number(value ?? 0).toLocaleString()}</div><div className="mt-1 text-[11px] text-ink-muted">{label}</div></div>; }
function InfoLine({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</div><div className={`mt-1 text-sm text-ink ${mono ? 'font-mono' : ''}`}>{value}</div></div>; }
function formatRelay(value: string) { return value?.length === 7 ? `${value.slice(0, 3)}-${value.slice(3)}` : value; }
function timeAgo(value: string) { const diff = Date.now() - new Date(value).getTime(); const minutes = Math.max(0, Math.floor(diff / 60000)); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }
