'use client';

import { PageLoading } from '@/components/page-loading';
import { StaffControlHeader } from '@/components/staff-control-header';
import { AppRole, getRolePreview } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, CircleHelp, Database, HardDrive, Radio, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

type Stats = {
  users: Record<string, number>;
  messaging: Record<string, number>;
  engagement: Record<string, number>;
  storage: Record<string, number>;
  generated_at: string;
};

type UserStorage = {
  id: string;
  display_name: string;
  relay_number: string;
  database_bytes_estimated: number;
  file_bytes: number;
  total_bytes: number;
};

type StorageOverview = {
  database_total_bytes: number;
  file_total_bytes: number;
  average_user_total_bytes: number;
  top_users: UserStorage[];
};

type RealtimeState = 'checking' | 'operational' | 'unavailable';

export default function OwnerSystemPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [ownerStorage, setOwnerStorage] = useState<StorageOverview | null>(null);
  const [realtime, setRealtime] = useState<RealtimeState>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const supabase = createClient() as any;

    void (async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw authError ?? new Error('Sign in required.');
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profileError) throw profileError;
      const actualRole = (profile?.role ?? 'user') as AppRole;
      const effectiveRole = actualRole === 'owner' ? getRolePreview(actualRole) : actualRole;
      if (actualRole !== 'owner' || effectiveRole !== 'owner') {
        if (active) setAllowed(false);
        return;
      }

      const [statsResult, storageResult] = await Promise.all([
        supabase.rpc('owner_dashboard_stats'),
        supabase.rpc('owner_storage_overview'),
      ]);
      if (statsResult.error) throw statsResult.error;
      if (storageResult.error) throw storageResult.error;
      if (active) {
        setStats(statsResult.data as Stats);
        setOwnerStorage(storageResult.data as StorageOverview);
        setAllowed(true);
      }
    })().catch((e: any) => {
      if (!active) return;
      setError(e?.message ?? 'Owner system data could not load.');
      setAllowed(false);
    });

    const channel = supabase.channel('owner-system-health').subscribe((status: string) => {
      if (!active) return;
      if (status === 'SUBSCRIBED') setRealtime('operational');
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setRealtime('unavailable');
    });

    const timeout = window.setTimeout(() => {
      if (active) setRealtime((current) => current === 'checking' ? 'unavailable' : current);
    }, 6000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      void supabase.removeChannel(channel);
    };
  }, []);

  if (allowed === null && !error) return <PageLoading />;
  if (!allowed || !stats) {
    return <div className="mx-auto max-w-4xl px-4 py-8 md:px-6"><div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-muted">{error ?? 'Owner view is required for System.'}</div></div>;
  }

  const storageBytes = Number(stats.storage.bytes_total ?? 0);
  const averageUserBytes = Number(ownerStorage?.average_user_total_bytes ?? 0);
  const storageAlerts = (ownerStorage?.top_users ?? []).filter((user) => averageUserBytes > 0 && Number(user.total_bytes) > averageUserBytes * 2 && Number(user.total_bytes) > 5 * 1024 * 1024);

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-8">
      <StaffControlHeader role="owner" active="system" />

      <section className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold text-ink"><ShieldCheck size={18} /> Verified system state</div>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">Relay only labels a service operational when this page actually verifies it. Unknown services stay unknown.</p>
          </div>
          <div className="hidden text-xs text-ink-faint sm:block">Snapshot {new Date(stats.generated_at).toLocaleTimeString()}</div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HealthCard icon={Database} label="Supabase data/API" status="Operational" detail="Owner dashboard RPC returned successfully." verified />
          <HealthCard icon={ShieldCheck} label="Authentication" status="Operational" detail="Current Owner session was verified." verified />
          <HealthCard icon={Radio} label="Realtime" status={realtime === 'checking' ? 'Checking…' : realtime === 'operational' ? 'Operational' : 'Unavailable'} detail={realtime === 'operational' ? 'Realtime channel subscribed successfully.' : realtime === 'checking' ? 'Waiting for channel subscription.' : 'Realtime channel did not confirm.'} verified={realtime === 'operational'} />
          <HealthCard icon={HardDrive} label="Storage snapshot" status="Available" detail={`${formatBytes(storageBytes)} across ${Number(stats.storage.buckets_used ?? 0).toLocaleString()} active buckets.`} verified />
        </div>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1fr_.8fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><HardDrive size={16} /> Storage</div>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SystemMetric label="Storage objects" value={formatBytes(storageBytes)} />
            <SystemMetric label="Postgres database" value={formatBytes(Number(ownerStorage?.database_total_bytes ?? 0))} />
            <SystemMetric label="Attributed files" value={formatBytes(Number(ownerStorage?.file_total_bytes ?? 0))} />
            <SystemMetric label="Average/user" value={formatBytes(averageUserBytes)} />
          </div>
          <div className="mt-5 border-t border-border pt-4 text-xs leading-5 text-ink-muted">Per-user database usage is an attribution estimate from user-related row payloads. Postgres indexes and shared-table overhead cannot be assigned perfectly to one account. Supabase file bytes are read from object metadata.</div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><CircleHelp size={16} /> Not yet probed</div>
          <p className="mt-1 text-xs text-ink-muted">These integrations may be working, but this page does not currently have a safe health endpoint for them.</p>
          <div className="mt-4 divide-y divide-border">
            <UnknownService label="Resend email delivery" />
            <UnknownService label="Google OAuth" />
            <UnknownService label="Google Calendar/Gmail APIs" />
            <UnknownService label="Push delivery service" />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">Largest account footprints</div>
              <p className="mt-1 text-xs text-ink-muted">Owner-only attribution across database rows and uploaded files.</p>
            </div>
            <span className="rounded-full border border-border px-2 py-1 text-[10px] uppercase tracking-wide text-ink-faint">Top 10</span>
          </div>
          {(ownerStorage?.top_users ?? []).length === 0 ? <p className="mt-5 text-sm text-ink-muted">No user storage attribution is available yet.</p> : (
            <div className="mt-4 divide-y divide-border">
              {(ownerStorage?.top_users ?? []).map((user) => {
                const flagged = averageUserBytes > 0 && Number(user.total_bytes) > averageUserBytes * 2 && Number(user.total_bytes) > 5 * 1024 * 1024;
                return (
                  <div key={user.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2"><span className="truncate text-sm font-medium text-ink">{user.display_name}</span>{flagged && <AlertTriangle size={13} className="shrink-0 text-ink-muted" aria-label="Storage above normal" />}</div>
                      <div className="mt-1 text-[11px] text-ink-faint">{formatRelay(user.relay_number)} · DB {formatBytes(Number(user.database_bytes_estimated))} · Files {formatBytes(Number(user.file_bytes))}</div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold text-ink">{formatBytes(Number(user.total_bytes))}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><AlertTriangle size={16} /> Storage alerts</div>
          <p className="mt-1 text-xs text-ink-muted">Flags only accounts above 2× the current average and above 5 MB total.</p>
          {storageAlerts.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-ink-muted">No unusual storage usage right now.</div> : (
            <div className="mt-4 space-y-2">{storageAlerts.map((user) => <div key={user.id} className="rounded-xl border border-border bg-canvas p-3"><div className="text-sm font-medium text-ink">{user.display_name}</div><div className="mt-1 text-xs text-ink-muted">{formatBytes(Number(user.total_bytes))} total · {(Number(user.total_bytes) / averageUserBytes).toFixed(1)}× average</div></div>)}</div>
          )}
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-surface p-5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint">Operational snapshot</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SystemMetric label="Auth accounts" value={Number(stats.users.auth_accounts ?? 0).toLocaleString()} />
          <SystemMetric label="Messages" value={Number(stats.messaging.messages_total ?? 0).toLocaleString()} />
          <SystemMetric label="Push devices" value={Number(stats.engagement.push_enabled_devices ?? 0).toLocaleString()} />
          <SystemMetric label="Unread notifications" value={Number(stats.engagement.notifications_unread ?? 0).toLocaleString()} />
        </div>
      </section>
    </div>
  );
}

function HealthCard({ icon: Icon, label, status, detail, verified }: { icon: typeof Database; label: string; status: string; detail: string; verified: boolean }) {
  return <div className="rounded-2xl border border-border bg-surface p-4"><div className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-canvas text-ink-muted"><Icon size={16} /></span><span className={`mt-1 h-2 w-2 rounded-full ${verified ? 'bg-ink' : 'border border-ink-faint'}`} /></div><div className="mt-4 text-xs text-ink-faint">{label}</div><div className="mt-1 text-base font-semibold text-ink">{status}</div><div className="mt-1 text-xs leading-5 text-ink-muted">{detail}</div></div>;
}
function SystemMetric({ label, value }: { label: string; value: string }) { return <div><div className="text-xl font-semibold tracking-tight text-ink">{value}</div><div className="mt-1 text-xs text-ink-muted">{label}</div></div>; }
function UnknownService({ label }: { label: string }) { return <div className="flex items-center justify-between gap-4 py-3 text-sm"><span className="text-ink-muted">{label}</span><span className="rounded-full border border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-ink-faint">Not checked</span></div>; }
function formatRelay(value: string) { return value?.length === 7 ? `${value.slice(0, 3)}-${value.slice(3)}` : value; }
function formatBytes(bytes: number) { if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'; const units = ['B', 'KB', 'MB', 'GB', 'TB']; const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1); return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`; }
