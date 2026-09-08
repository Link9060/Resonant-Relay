'use client';

import { createClient } from '@/lib/supabase/client';
import { appPageUrl } from '@/lib/config';
import type { AppRole } from '@/lib/role-preview';
import { Activity, Ban, Database, Loader2, MessageCircle, NotebookPen, RefreshCw, ShieldCheck, Users, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type InspectorTab = 'overview' | 'contacts' | 'groups' | 'conversations' | 'reports' | 'activity' | 'data' | 'security' | 'notes';

type UserSummary = {
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

type Props = {
  user: UserSummary;
  currentUserId: string | null;
  busy: boolean;
  onSelectUser: (id: string) => void;
  onRoleChange: (role: AppRole) => void;
  onToggleBan: () => void;
  onForceSignOut: () => void;
  onDeleteUser: () => void;
};

type NotesTabProps = {
  notes: any[];
  draft: string;
  setDraft: (value: string) => void;
  busy: boolean;
  onAdd: () => void;
  onDelete: (id: string) => void;
};

type SecurityTabProps = {
  data: any;
  user: UserSummary;
  currentUserId: string | null;
  busy: boolean;
  onRoleChange: (role: AppRole) => void;
  onToggleBan: () => void;
  onForceSignOut: () => void;
  onDeleteUser: () => void;
};

const TABS: Array<{ id: InspectorTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'groups', label: 'Groups' },
  { id: 'conversations', label: 'Conversations' },
  { id: 'reports', label: 'Reports' },
  { id: 'activity', label: 'Activity' },
  { id: 'data', label: 'Data' },
  { id: 'security', label: 'Security' },
  { id: 'notes', label: 'Notes' },
];

const ROLE_ORDER: AppRole[] = ['user', 'moderator', 'admin', 'owner'];

export function OwnerUserInspector({ user, currentUserId, busy, onSelectUser, onRoleChange, onToggleBan, onForceSignOut, onDeleteUser }: Props) {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<InspectorTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);

  async function load(silent = false) {
    if (silent) setRefreshing(true); else setLoading(true);
    setError(null);
    const { data: result, error: rpcError } = await (createClient() as any).rpc('owner_user_inspector', { p_user_id: user.id });
    if (rpcError) setError(rpcError.message ?? 'Owner account details could not load.');
    else setData(result);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    setTab('overview');
    setData(null);
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const health = useMemo(() => accountHealth(data, user), [data, user]);

  async function addNote() {
    const clean = noteDraft.trim();
    if (!clean) return;
    setNoteBusy(true);
    setError(null);
    const { error: rpcError } = await (createClient() as any).rpc('owner_add_user_note', { p_user_id: user.id, p_note: clean });
    setNoteBusy(false);
    if (rpcError) {
      setError(rpcError.message ?? 'Note could not be added.');
      return;
    }
    setNoteDraft('');
    await load(true);
  }

  async function deleteNote(noteId: string) {
    if (!window.confirm('Delete this Owner note?')) return;
    setNoteBusy(true);
    const { error: rpcError } = await (createClient() as any).rpc('owner_delete_user_note', { p_note_id: noteId });
    setNoteBusy(false);
    if (rpcError) {
      setError(rpcError.message ?? 'Note could not be deleted.');
      return;
    }
    await load(true);
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">◆ Owner Inspector</span>
          <h2 className="mt-2 text-xl font-semibold text-ink">{user.display_name}</h2>
          <p className="mt-1 text-xs text-ink-muted">{user.primary_email ?? 'No primary email'} · {formatRelay(user.relay_number)}</p>
          {user.school && <p className="mt-1 text-xs text-ink-faint">{user.school}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HealthBadge status={health.status} label={health.label} />
          <RoleBadge role={user.role} />
          <button type="button" disabled={refreshing} onClick={() => void load(true)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-ink-muted hover:bg-canvas disabled:opacity-50" aria-label="Refresh account inspector">
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="-mx-1 mt-4 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Owner account inspector sections">
        <div className="flex min-w-max gap-1">
          {TABS.map((item) => (
            <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`min-h-10 rounded-lg px-3 text-xs font-medium transition-colors ${tab === item.id ? 'bg-ink text-canvas' : 'text-ink-muted hover:bg-canvas hover:text-ink'}`}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mt-4 rounded-xl border border-border bg-canvas p-3 text-sm text-ink">{error}</div>}
      {loading ? (
        <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-ink-muted"><Loader2 size={16} className="animate-spin" />Loading Owner details…</div>
      ) : data ? (
        <div className="mt-4">
          {tab === 'overview' && <OverviewTab data={data} health={health} />}
          {tab === 'contacts' && <ContactsTab contacts={data.contacts ?? []} onSelectUser={onSelectUser} />}
          {tab === 'groups' && <GroupsTab groups={data.groups ?? []} />}
          {tab === 'conversations' && <ConversationsTab conversations={data.conversations ?? []} />}
          {tab === 'reports' && <ReportsTab reports={data.reports ?? { received: [], submitted: [] }} />}
          {tab === 'activity' && <ActivityTab timeline={data.timeline ?? []} />}
          {tab === 'data' && <DataTab data={data} />}
          {tab === 'security' && <SecurityTab data={data} user={user} currentUserId={currentUserId} busy={busy} onRoleChange={onRoleChange} onToggleBan={onToggleBan} onForceSignOut={onForceSignOut} onDeleteUser={onDeleteUser} />}
          {tab === 'notes' && <NotesTab notes={data.notes ?? []} draft={noteDraft} setDraft={setNoteDraft} busy={noteBusy} onAdd={() => void addNote()} onDelete={(id: string) => void deleteNote(id)} />}
        </div>
      ) : null}
    </div>
  );
}

function OverviewTab({ data, health }: { data: any; health: ReturnType<typeof accountHealth> }) {
  const overview = data.overview ?? {};
  const storage = data.storage ?? {};
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-canvas p-4">
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-sm font-semibold text-ink">Account health</div><p className="mt-1 text-xs text-ink-muted">Real account signals only — no synthetic score.</p></div>
          <HealthBadge status={health.status} label={health.label} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{health.signals.map((signal) => <span key={signal} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-ink-muted">{signal}</span>)}</div>
      </section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Messages" value={overview.message_count ?? 0} />
        <Metric label="Contacts" value={overview.contact_count ?? 0} />
        <Metric label="Groups" value={overview.group_count ?? 0} />
        <Metric label="Open reports" value={overview.open_report_count ?? 0} />
      </div>
      <section className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Last active" value={overview.last_sign_in_at ? timeAgo(overview.last_sign_in_at) : 'Never'} />
        <InfoCard label="Joined" value={formatDate(overview.created_at)} />
        <InfoCard label="Connected services" value={`${overview.gmail_connected ? 'Gmail' : 'No Gmail'} · ${overview.calendar_connected ? 'Calendar' : 'No Calendar'} · ${Number(overview.email_accounts ?? 0)} email account${Number(overview.email_accounts ?? 0) === 1 ? '' : 's'}`} />
        <InfoCard label="Total footprint" value={formatBytes(storage.total_bytes)} helper={`${formatBytes(storage.database_bytes_estimated)} estimated database · ${formatBytes(storage.file_bytes)} files`} />
      </section>
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-ink-muted" /><div><p className="text-sm font-medium text-ink">Privacy boundary</p><p className="mt-1 text-xs leading-5 text-ink-muted">This inspector exposes operational metadata needed for account management. Private message bodies are not included unless a message was separately reported into Moderation.</p></div></div>
      </section>
    </div>
  );
}

function ContactsTab({ contacts, onSelectUser }: { contacts: any[]; onSelectUser: (id: string) => void }) {
  if (!contacts.length) return <EmptyState icon={<Users size={18} />} title="No contacts" body="This user currently has no accepted Relay contacts." />;
  return <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">{contacts.map((contact) => (
    <li key={contact.id}>
      <button type="button" onClick={() => onSelectUser(contact.id)} className="flex min-h-16 w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-canvas">
        <div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{contact.display_name}</p><p className="mt-1 truncate text-xs text-ink-faint">{formatRelay(contact.relay_number)}{contact.school ? ` · ${contact.school}` : ''}</p></div>
        <div className="shrink-0 text-right"><p className="text-xs text-ink-muted">{Number(contact.mutual_count ?? 0)} mutual</p><p className="mt-1 text-[10px] text-ink-faint">Connected {formatDate(contact.connected_at)}</p></div>
      </button>
    </li>
  ))}</ul>;
}

function GroupsTab({ groups }: { groups: any[] }) {
  if (!groups.length) return <EmptyState icon={<UsersRound size={18} />} title="No groups" body="This user is not currently a member of any Relay groups." />;
  return <div className="grid gap-3 sm:grid-cols-2">{groups.map((group) => (
    <section key={group.id} className="rounded-xl border border-border bg-canvas p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-ink">{group.name}</p><p className="mt-1 text-xs capitalize text-ink-faint">{group.role}</p></div><span className="text-xs text-ink-muted">{group.member_count} members</span></div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-ink-muted"><span>{Number(group.message_count ?? 0).toLocaleString()} messages</span><span className="text-right">{group.last_message_at ? timeAgo(group.last_message_at) : 'No messages'}</span></div>
    </section>
  ))}</div>;
}

function ConversationsTab({ conversations }: { conversations: any[] }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-canvas p-4"><div className="flex gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-ink-muted" /><div><p className="text-sm font-medium text-ink">Conversation metadata only</p><p className="mt-1 text-xs leading-5 text-ink-muted">Owner can see participants, activity, and message counts here. Private message bodies are not exposed through account inspection.</p></div></div></div>
      {!conversations.length ? <EmptyState icon={<MessageCircle size={18} />} title="No conversations" body="No Relay conversation metadata is associated with this account." /> : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">{conversations.map((conversation) => (
          <li key={conversation.id} className="px-4 py-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{conversation.group_name || (conversation.type === 'group' ? 'Group conversation' : 'Direct conversation')}</p><p className="mt-1 truncate text-xs text-ink-faint">{(conversation.participants ?? []).map((participant: any) => participant.display_name).join(' · ')}</p></div><div className="shrink-0 text-right"><p className="text-xs text-ink-muted">{Number(conversation.message_count ?? 0).toLocaleString()} messages</p><p className="mt-1 text-[10px] text-ink-faint">{conversation.last_message_at ? timeAgo(conversation.last_message_at) : 'No activity'}</p></div></div></li>
        ))}</ul>
      )}
    </div>
  );
}

function ReportsTab({ reports }: { reports: { received: any[]; submitted: any[] } }) {
  return <div className="grid gap-4 lg:grid-cols-2"><ReportList title="Reports about this user" items={reports.received ?? []} variant="received" /><ReportList title="Reports submitted by this user" items={reports.submitted ?? []} variant="submitted" /></div>;
}

function ReportList({ title, items, variant }: { title: string; items: any[]; variant: 'received' | 'submitted' }) {
  return <section className="rounded-xl border border-border bg-canvas p-4"><div className="text-sm font-semibold text-ink">{title}</div>{!items.length ? <p className="mt-4 text-sm text-ink-muted">None.</p> : <ul className="mt-3 divide-y divide-border">{items.map((report) => <li key={report.id} className="py-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-medium text-ink">{humanize(report.reason)}</p><span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-ink-muted">{report.status}</span></div><p className="mt-1 text-xs text-ink-faint">{variant === 'received' ? `Reported by ${report.reporter_name}` : report.reported_name ? `About ${report.reported_name}` : 'General report'} · {formatDate(report.created_at)}</p>{report.details && <p className="mt-2 line-clamp-3 text-xs leading-5 text-ink-muted">{report.details}</p>}</li>)}</ul>}</section>;
}

function ActivityTab({ timeline }: { timeline: any[] }) {
  if (!timeline.length) return <EmptyState icon={<Activity size={18} />} title="No tracked activity yet" body="Relationship and staff activity recorded after this feature ships will appear here." />;
  return <ol className="relative space-y-0 border-l border-border pl-5">{timeline.map((event, index) => <li key={`${event.created_at}-${index}`} className="relative pb-5"><span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface bg-ink" /><p className="text-sm font-medium text-ink">{eventLabel(event)}</p><p className="mt-1 text-xs text-ink-faint">{formatDateTime(event.created_at)}</p></li>)}</ol>;
}

function DataTab({ data }: { data: any }) {
  const storage = data.storage ?? {};
  const overview = data.overview ?? {};
  const average = Number(storage.average_user_total_bytes ?? 0);
  const total = Number(storage.total_bytes ?? 0);
  const ratio = average > 0 ? total / average : 0;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-canvas p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Database size={16} />Data & storage</div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Estimated DB" value={formatBytes(storage.database_bytes_estimated)} /><Metric label="Files" value={formatBytes(storage.file_bytes)} /><Metric label="Total footprint" value={formatBytes(storage.total_bytes)} /><Metric label="File objects" value={storage.file_count ?? 0} /></div>
        {average > 0 && <p className="mt-4 text-xs text-ink-muted">Relay average: {formatBytes(average)} per user. This account is {ratio < 0.1 ? '<0.1' : ratio.toFixed(1)}× average.</p>}
        <p className="mt-2 text-[11px] leading-5 text-ink-faint">Database usage is an attribution estimate from user-related row payloads. File bytes come from Supabase Storage object metadata. Shared Postgres overhead cannot be perfectly assigned to one user.</p>
      </section>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Messages" value={overview.message_count ?? 0} /><Metric label="To-dos" value={overview.todo_count ?? 0} /><Metric label="Conversations" value={overview.conversation_count ?? 0} /><Metric label="Privacy requests" value={overview.privacy_requests ?? 0} /></section>
    </div>
  );
}

function SecurityTab({ data, user, currentUserId, busy, onRoleChange, onToggleBan, onForceSignOut, onDeleteUser }: SecurityTabProps) {
  const sessions = data.sessions ?? [];
  const protectedAccount = user.role === 'owner' || user.id === currentUserId;
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-canvas p-4">
        <div className="text-sm font-semibold text-ink">Recent sessions</div>
        <p className="mt-1 text-xs text-ink-muted">Device/browser labels are derived from Supabase session user-agent data. Precise location is not shown.</p>
        {!sessions.length ? <p className="mt-4 text-sm text-ink-muted">No active/recent sessions are currently recorded.</p> : <ul className="mt-3 divide-y divide-border">{sessions.map((session: any) => <li key={session.id} className="py-3"><p className="truncate text-sm font-medium text-ink">{deviceLabel(session.user_agent)}</p><p className="mt-1 text-xs text-ink-faint">Refreshed {session.refreshed_at ? timeAgo(session.refreshed_at) : 'unknown'} · AAL {session.aal ?? 'unknown'}</p></li>)}</ul>}
      </section>
      <section className="rounded-xl border border-border bg-canvas p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldCheck size={15} />Sensitive access</div>
        <p className="mt-1 text-xs leading-5 text-ink-muted">Opening this deep inspector and using sensitive Owner controls are written to Relay's permanent audit log.</p>
        <a href={appPageUrl('/admin/access-audit')} className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-xs font-medium text-ink hover:bg-surface-raised">Open Sensitive Access Audit</a>
      </section>
      <section className="rounded-xl border border-border bg-canvas p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldCheck size={15} />Owner controls</div>
        <label className="mt-4 block text-xs text-ink-muted">Role<select value={user.role} disabled={busy || user.id === currentUserId} onChange={(event) => onRoleChange(event.target.value as AppRole)} className="mt-1.5 min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-ink disabled:opacity-50">{ROLE_ORDER.map((option) => <option key={option} value={option}>{capitalize(option)}</option>)}</select></label>
        <div className="mt-4 grid gap-2 sm:grid-cols-3"><OwnerAction disabled={busy || protectedAccount} onClick={onToggleBan} icon={<Ban size={14} />}>{user.banned_at ? 'Unban account' : 'Ban account'}</OwnerAction><OwnerAction disabled={busy || protectedAccount} onClick={onForceSignOut}>Force sign out</OwnerAction><OwnerAction disabled={busy || protectedAccount} onClick={onDeleteUser} destructive>Delete account</OwnerAction></div>
        {protectedAccount && <p className="mt-3 text-xs text-ink-faint">Owner/self accounts are protected from destructive controls here.</p>}
      </section>
    </div>
  );
}

function NotesTab({ notes, draft, setDraft, busy, onAdd, onDelete }: NotesTabProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-canvas p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><NotebookPen size={16} />Owner notes</div>
        <p className="mt-1 text-xs text-ink-muted">Private Owner-only notes. Additions and deletions are audit logged.</p>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1000} rows={3} placeholder="Add context for future account reviews…" className="mt-4 w-full resize-none rounded-xl border border-border bg-surface px-3 py-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-ink-muted" />
        <div className="mt-2 flex justify-end"><button type="button" disabled={busy || !draft.trim()} onClick={onAdd} className="min-h-10 rounded-lg bg-ink px-4 text-sm font-medium text-canvas disabled:opacity-40">{busy ? 'Saving…' : 'Add note'}</button></div>
      </section>
      {!notes.length ? <p className="text-sm text-ink-muted">No Owner notes for this account.</p> : <ul className="space-y-2">{notes.map((note: any) => <li key={note.id} className="rounded-xl border border-border bg-canvas p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-ink">{note.note}</p><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-ink-faint">{note.created_by_name ?? 'Owner'} · {formatDateTime(note.created_at)}</p><button type="button" disabled={busy} onClick={() => onDelete(String(note.id))} className="text-xs text-ink-faint hover:text-ink">Delete</button></div></li>)}</ul>}
    </div>
  );
}

function accountHealth(data: any, fallback: UserSummary) {
  const overview = data?.overview ?? fallback;
  const storage = data?.storage ?? {};
  const signals: string[] = [];
  const openReports = Number(overview.open_report_count ?? fallback.open_report_count ?? 0);
  const total = Number(storage.total_bytes ?? 0);
  const average = Number(storage.average_user_total_bytes ?? 0);
  if (overview.banned_at || fallback.banned_at) signals.push('Account disabled');
  if (openReports > 0) signals.push(`${openReports} open report${openReports === 1 ? '' : 's'}`);
  if (average > 0 && total > average * 2 && total > 5 * 1024 * 1024) signals.push('Storage above normal');
  if (!overview.last_sign_in_at && !fallback.last_sign_in_at) signals.push('Never signed in');
  if (overview.gmail_connected) signals.push('Gmail connected');
  if (overview.calendar_connected) signals.push('Calendar connected');
  if (!signals.length) signals.push('No current flags');
  if (overview.banned_at || fallback.banned_at || openReports >= 3) return { status: 'attention' as const, label: 'Needs attention', signals };
  if (openReports > 0 || (average > 0 && total > average * 2 && total > 5 * 1024 * 1024)) return { status: 'watch' as const, label: 'Review', signals };
  return { status: 'good' as const, label: 'Normal', signals };
}

function HealthBadge({ status, label }: { status: 'good' | 'watch' | 'attention'; label: string }) { return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${status === 'attention' ? 'border-red-500/40 text-red-600' : status === 'watch' ? 'border-ink-muted text-ink' : 'border-border text-ink-muted'}`}>{label}</span>; }
function RoleBadge({ role }: { role: AppRole }) { return <span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-muted">{role}</span>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-border bg-canvas p-3"><div className="text-lg font-semibold text-ink">{typeof value === 'number' ? Number(value ?? 0).toLocaleString() : value}</div><div className="mt-1 text-[11px] text-ink-muted">{label}</div></div>; }
function InfoCard({ label, value, helper }: { label: string; value: string; helper?: string }) { return <div className="rounded-xl border border-border bg-canvas p-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">{label}</div><div className="mt-1 text-sm font-medium text-ink">{value}</div>{helper && <div className="mt-1 text-[11px] text-ink-faint">{helper}</div>}</div>; }
function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) { return <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center"><div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink-muted">{icon}</div><p className="mt-3 text-sm font-medium text-ink">{title}</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-ink-muted">{body}</p></div>; }
function OwnerAction({ children, disabled, onClick, icon, destructive = false }: { children: React.ReactNode; disabled: boolean; onClick: () => void; icon?: React.ReactNode; destructive?: boolean }) { return <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${destructive ? 'border-red-500/30 text-red-600 hover:bg-red-500/10' : 'border-border text-ink hover:bg-surface-raised'}`}>{icon}{children}</button>; }
function formatRelay(value: string) { return value?.length === 7 ? `${value.slice(0, 3)}-${value.slice(3)}` : value; }
function capitalize(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function humanize(value: string) { return String(value ?? '').split('_').map(capitalize).join(' '); }
function formatDate(value?: string | null) { if (!value) return 'Unknown'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString(); }
function formatDateTime(value?: string | null) { if (!value) return 'Unknown'; const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
function formatBytes(value: unknown) { const bytes = Math.max(0, Number(value ?? 0)); if (bytes < 1024) return `${Math.round(bytes)} B`; if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`; if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`; return `${(bytes / 1024 ** 3).toFixed(2)} GB`; }
function timeAgo(value: string) { const diff = Date.now() - new Date(value).getTime(); const minutes = Math.max(0, Math.floor(diff / 60000)); if (minutes < 60) return `${minutes}m ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`; return `${Math.floor(hours / 24)}d ago`; }
function deviceLabel(userAgent?: string | null) { const ua = userAgent ?? ''; const device = /iPhone/i.test(ua) ? 'iPhone' : /iPad/i.test(ua) ? 'iPad' : /Macintosh|Mac OS X/i.test(ua) ? 'Mac' : /Android/i.test(ua) ? 'Android' : /Windows/i.test(ua) ? 'Windows device' : 'Browser session'; const browser = /CriOS|Chrome/i.test(ua) ? 'Chrome' : /FxiOS|Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : ''; return browser ? `${device} · ${browser}` : device; }
function eventLabel(event: any) { if (event.type === 'contact_added') return `Connected with ${event.other_user_name ?? 'a user'}`; if (event.type === 'contact_removed') return `Contact removed: ${event.other_user_name ?? 'user'}`; if (event.type === 'blocked_user') return `Blocked ${event.other_user_name ?? 'a user'}`; if (event.type === 'blocked_by_user') return `Blocked by ${event.other_user_name ?? 'a user'}`; if (event.type === 'unblocked_user') return `Unblocked ${event.other_user_name ?? 'a user'}`; if (event.type === 'unblocked_by_user') return `Unblocked by ${event.other_user_name ?? 'a user'}`; if (event.type === 'staff_action') return `Staff action: ${humanize(event.action ?? 'updated_account')}`; if (event.type === 'staff_request') return `Submitted ${humanize(event.request_type ?? 'staff_request')}`; return 'Account activity'; }
