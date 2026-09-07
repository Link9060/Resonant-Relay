'use client';

import { PageLoading } from '@/components/page-loading';
import { StaffControlHeader } from '@/components/staff-control-header';
import { AppRole, getRolePreview } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { Search, ShieldCheck, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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

const ROLE_ORDER: AppRole[] = ['user', 'moderator', 'admin', 'owner'];

export default function StaffUsersPage() {
  const [actualRole, setActualRole] = useState<AppRole | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(preferredId?: string | null) {
    setError(null);
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
      return;
    }
    const { data, error: usersError } = await supabase.rpc('admin_list_users_v2', { p_limit: 250, p_offset: 0 });
    if (usersError) throw usersError;
    const rows = (data ?? []) as UserRow[];
    setUsers(rows);
    const target = preferredId && rows.some((row) => row.id === preferredId) ? preferredId : rows[0]?.id ?? null;
    setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : target);
  }

  useEffect(() => {
    void load().catch((e: any) => setError(e?.message ?? 'User inspector could not load.'));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user) => [user.display_name, user.primary_email, user.relay_number, user.school, user.role].filter(Boolean).some((value) => String(value).toLowerCase().includes(q)));
  }, [query, users]);
  const selected = users.find((user) => user.id === selectedId) ?? null;

  async function changeRole(nextRole: AppRole) {
    if (role !== 'owner' || !selected) return;
    if (selected.id === currentUserId) return;
    setBusy(true);
    const supabase = createClient() as any;
    const { error: actionError } = await supabase.rpc('set_user_role', { p_user_id: selected.id, p_role: nextRole });
    if (actionError) setError(actionError.message); else await load(selected.id);
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
    setBusy(true);
    const { error: actionError } = await (createClient() as any).rpc('owner_set_user_ban', { p_user_id: selected.id, p_banned: banning, p_reason: reason || null });
    if (actionError) setError(actionError.message); else await load(selected.id);
    setBusy(false);
  }

  async function forceSignOut() {
    if (role !== 'owner' || !selected || selected.role === 'owner' || selected.id === currentUserId) return;
    if (!window.confirm(`Force ${selected.display_name} to sign out on all devices?`)) return;
    setBusy(true);
    const { error: actionError } = await (createClient() as any).rpc('owner_force_sign_out', { p_user_id: selected.id });
    if (actionError) setError(actionError.message); else await load(selected.id);
    setBusy(false);
  }

  async function removeUser() {
    if (role !== 'owner' || !selected || selected.role === 'owner' || selected.id === currentUserId) return;
    const confirmation = window.prompt(`Permanently remove ${selected.display_name} and their Relay data? Type REMOVE to confirm.`);
    if (confirmation !== 'REMOVE') return;
    setBusy(true);
    const { error: actionError } = await (createClient() as any).rpc('owner_delete_user', { p_user_id: selected.id });
    if (actionError) setError(actionError.message); else await load(null);
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

      <div className="mt-6 grid min-h-[560px] gap-4 lg:grid-cols-[minmax(300px,.78fr)_minmax(0,1.22fr)]">
        <section className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border p-4">
            <div className="text-sm font-semibold text-ink">Account directory</div>
            <div className="mt-1 text-xs text-ink-muted">{users.length} accounts available to inspect.</div>
            <label className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2">
              <Search size={14} className="text-ink-faint" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, Relay…" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" />
            </label>
          </div>
          <div className="max-h-[620px] overflow-y-auto p-2">
            {filtered.map((user) => (
              <button key={user.id} type="button" onClick={() => setSelectedId(user.id)} className={`block w-full rounded-xl px-3 py-3 text-left transition-colors ${selectedId === user.id ? 'bg-surface-raised' : 'hover:bg-canvas'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><div className="truncate text-sm font-medium text-ink">{user.display_name}</div><div className="mt-0.5 truncate text-xs text-ink-muted">{user.primary_email ?? formatRelay(user.relay_number)}</div></div>
                  <RoleBadge role={user.role} />
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-ink-faint"><span>{user.banned_at ? 'Banned' : 'Active'}</span><span>·</span><span>{user.last_sign_in_at ? timeAgo(user.last_sign_in_at) : 'Never signed in'}</span></div>
              </button>
            ))}
            {filtered.length === 0 && <div className="px-4 py-8 text-center text-xs text-ink-muted">No accounts match that search.</div>}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          {!selected ? <div className="flex min-h-80 items-center justify-center text-sm text-ink-muted">Select an account to inspect.</div> : (
            <>
              <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-canvas text-ink-muted"><UserRound size={18} /></span>
                  <div><div className="text-xl font-semibold text-ink">{selected.display_name}</div><div className="mt-1 text-xs text-ink-muted">{selected.primary_email ?? 'No primary email'} · {formatRelay(selected.relay_number)}</div>{selected.school && <div className="mt-1 text-xs text-ink-faint">{selected.school}</div>}</div>
                </div>
                <div className="flex items-center gap-2"><RoleBadge role={selected.role} /><span className={`rounded-full border px-2 py-1 text-[10px] font-medium ${selected.banned_at ? 'border-ink text-ink' : 'border-border text-ink-muted'}`}>{selected.banned_at ? 'Banned' : 'Active'}</span></div>
              </div>

              <div className="grid grid-cols-2 gap-3 py-5 sm:grid-cols-4">
                <InspectorMetric label="Messages" value={selected.message_count} />
                <InspectorMetric label="Contacts" value={selected.connection_count} />
                <InspectorMetric label="Reports" value={selected.report_count} />
                <InspectorMetric label="Open reports" value={selected.open_report_count} />
              </div>

              <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                <InfoLine label="Last active" value={selected.last_sign_in_at ? timeAgo(selected.last_sign_in_at) : 'Never'} />
                <InfoLine label="Joined" value={new Date(selected.created_at).toLocaleDateString()} />
                <InfoLine label="Gmail" value={selected.gmail_connected ? 'Connected' : 'Not connected'} />
                <InfoLine label="Account ID" value={selected.id.slice(0, 8) + '…'} mono />
              </div>

              {selected.banned_at && <div className="mt-5 rounded-xl border border-border bg-canvas p-4 text-sm text-ink-muted"><div className="font-medium text-ink">Account disabled</div><div className="mt-1 text-xs">{selected.ban_reason || 'No ban reason recorded.'}</div></div>}

              {role === 'owner' && (
                <div className="mt-6 border-t border-border pt-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldCheck size={15} /> Owner controls</div>
                  <p className="mt-1 text-xs text-ink-muted">Protected accounts cannot be removed, banned, or force-signed-out from here.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <label className="block text-xs text-ink-muted">Role
                      <select value={selected.role} disabled={busy || selected.id === currentUserId} onChange={(e) => void changeRole(e.target.value as AppRole)} className="mt-1.5 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink disabled:opacity-50">
                        {ROLE_ORDER.map((option) => <option key={option} value={option}>{capitalize(option)}</option>)}
                      </select>
                    </label>
                    <div className="flex flex-wrap items-end gap-2">
                      <ActionButton disabled={busy || selected.role === 'owner' || selected.id === currentUserId} onClick={() => void toggleBan()}>{selected.banned_at ? 'Unban' : 'Ban'}</ActionButton>
                      <ActionButton disabled={busy || selected.role === 'owner' || selected.id === currentUserId} onClick={() => void forceSignOut()}>Sign out</ActionButton>
                      <ActionButton disabled={busy || selected.role === 'owner' || selected.id === currentUserId} onClick={() => void removeUser()}>Remove</ActionButton>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: AppRole }) { return <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-muted">{role}</span>; }
function InspectorMetric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl border border-border bg-canvas p-3"><div className="text-xl font-semibold text-ink">{Number(value ?? 0).toLocaleString()}</div><div className="mt-1 text-[11px] text-ink-muted">{label}</div></div>; }
function InfoLine({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div><div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</div><div className={`mt-1 text-sm text-ink ${mono ? 'font-mono' : ''}`}>{value}</div></div>; }
function ActionButton({ children, disabled, onClick }: { children: React.ReactNode; disabled: boolean; onClick: () => void }) { return <button type="button" disabled={disabled} onClick={onClick} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40">{children}</button>; }
function formatRelay(value: string) { return value?.length === 7 ? `${value.slice(0, 3)}-${value.slice(3)}` : value; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function timeAgo(value: string) { const diff = Date.now() - new Date(value).getTime(); const minutes = Math.max(0, Math.floor(diff / 60000)); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }
