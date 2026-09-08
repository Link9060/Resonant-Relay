'use client';

import { PageLoading } from '@/components/page-loading';
import { StaffControlHeader } from '@/components/staff-control-header';
import { AppRole, getRolePreview } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { Activity, BarChart3, MessageCircle, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Stats = {
  users: Record<string, number>;
  messaging: Record<string, number>;
  engagement: Record<string, number>;
  storage: Record<string, number>;
  generated_at: string;
};

export default function OwnerAnalyticsPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const supabase = createClient() as any;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (profileError) throw profileError;
      const actualRole = (profile?.role ?? 'user') as AppRole;
      const effectiveRole = actualRole === 'owner' ? getRolePreview(actualRole) : actualRole;
      if (actualRole !== 'owner' || effectiveRole !== 'owner') {
        setAllowed(false);
        return;
      }
      const { data, error: statsError } = await supabase.rpc('owner_dashboard_stats');
      if (statsError) throw statsError;
      setStats(data as Stats);
      setAllowed(true);
    })().catch((e: any) => {
      setError(e?.message ?? 'Owner analytics could not load.');
      setAllowed(false);
    });
  }, []);

  const activity = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Active today', value: Number(stats.users.active_24h ?? 0), max: Number(stats.users.total ?? 1) },
      { label: 'Active 7 days', value: Number(stats.users.active_7d ?? 0), max: Number(stats.users.total ?? 1) },
      { label: 'Active 30 days', value: Number(stats.users.active_30d ?? 0), max: Number(stats.users.total ?? 1) },
    ];
  }, [stats]);

  if (allowed === null && !error) return <PageLoading />;
  if (!allowed || !stats) {
    return <div className="mx-auto max-w-4xl px-4 py-8 md:px-6"><div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-muted">{error ?? 'Owner view is required for Analytics.'}</div></div>;
  }

  const totalUsers = Number(stats.users.total ?? 0);
  const messages24h = Number(stats.messaging.messages_24h ?? 0);
  const messages7d = Number(stats.messaging.messages_7d ?? 0);
  const conversations = Number(stats.messaging.conversations_total ?? 0);

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-8">
      <StaffControlHeader role="owner" active="analytics" />

      <section className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-8 -top-10 text-[180px] font-semibold leading-none text-ink opacity-[0.025]">◆</div>
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint"><BarChart3 size={14} /> Owner analytics</div>
            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
              <HeroMetric label="Relay users" value={totalUsers} />
              <HeroMetric label="Active 7d" value={Number(stats.users.active_7d ?? 0)} />
              <HeroMetric label="Messages 24h" value={messages24h} />
              <HeroMetric label="Conversations" value={conversations} />
            </div>
            <div className="mt-6 border-t border-border pt-4 text-xs text-ink-faint">Snapshot generated {new Date(stats.generated_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Activity size={16} /> User activity windows</div>
          <p className="mt-1 text-xs text-ink-muted">Share of all Relay accounts active in each window.</p>
          <div className="mt-5 space-y-4">
            {activity.map((item) => <ActivityBar key={item.label} {...item} />)}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <InsightPanel icon={Users} title="Growth">
          <MetricLine label="New today" value={stats.users.new_24h} />
          <MetricLine label="New 7 days" value={stats.users.new_7d} />
          <MetricLine label="New 30 days" value={stats.users.new_30d} />
          <MetricLine label="Moderators" value={stats.users.moderators} />
          <MetricLine label="Admins" value={stats.users.admins} />
        </InsightPanel>

        <InsightPanel icon={MessageCircle} title="Messaging">
          <MetricLine label="Messages total" value={stats.messaging.messages_total} />
          <MetricLine label="Messages 7 days" value={messages7d} />
          <MetricLine label="Direct chats" value={stats.messaging.direct_conversations} />
          <MetricLine label="Group chats" value={stats.messaging.group_conversations} />
          <MetricLine label="Connections" value={stats.messaging.connections_total} />
        </InsightPanel>

        <InsightPanel icon={Activity} title="Engagement">
          <MetricLine label="Notifications" value={stats.engagement.notifications_total} />
          <MetricLine label="Unread notifications" value={stats.engagement.notifications_unread} />
          <MetricLine label="Push devices" value={stats.engagement.push_enabled_devices} />
          <MetricLine label="Users with push" value={stats.engagement.users_with_push} />
          <MetricLine label="Number lookups 24h" value={stats.engagement.relay_number_lookups_24h} />
        </InsightPanel>
      </section>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: number }) {
  return <div><div className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{Number(value ?? 0).toLocaleString()}</div><div className="mt-1 text-xs text-ink-muted">{label}</div></div>;
}

function ActivityBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs"><span className="font-medium text-ink">{label}</span><span className="text-ink-faint">{value.toLocaleString()} · {percent}%</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${percent}%` }} /></div>
    </div>
  );
}

function InsightPanel({ icon: Icon, title, children }: { icon: typeof Users; title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center gap-2 text-sm font-semibold text-ink"><Icon size={16} />{title}</div><div className="mt-4 divide-y divide-border">{children}</div></div>;
}

function MetricLine({ label, value }: { label: string; value: number | undefined }) {
  return <div className="flex items-center justify-between gap-4 py-2.5 text-sm"><span className="text-ink-muted">{label}</span><span className="font-medium tabular-nums text-ink">{Number(value ?? 0).toLocaleString()}</span></div>;
}
