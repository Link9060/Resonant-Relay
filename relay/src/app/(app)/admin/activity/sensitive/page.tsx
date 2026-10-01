'use client';

import { PageLoading } from '@/components/page-loading';
import { StaffControlHeader } from '@/components/staff-control-header';
import { appPageUrl } from '@/lib/config';
import { AppRole, getRolePreview } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Eye, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

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

export default function SensitiveAccessAuditPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const supabase = createClient() as any;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Sign in required.');
        const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (profileError) throw profileError;
        const actualRole = (profile?.role ?? 'user') as AppRole;
        const effectiveRole = actualRole === 'owner' ? getRolePreview(actualRole) : actualRole;
        if (actualRole !== 'owner' || effectiveRole !== 'owner') {
          if (active) setAllowed(false);
          return;
        }
        const { data, error: auditError } = await supabase.rpc('owner_list_audit_log', { p_limit: 500, p_offset: 0 });
        if (auditError) throw auditError;
        if (!active) return;
        setRows(((data ?? []) as AuditRow[]).filter((row) => isSensitiveAction(row.action)));
        setAllowed(true);
      })().catch((e: any) => {
        if (!active) return;
        setError(e?.message ?? 'Sensitive access audit could not load.');
        setAllowed(false);
      });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => [row.action, row.actor_name, row.actor_email, row.target_name, row.target_email, JSON.stringify(row.metadata ?? {})].filter(Boolean).some((value) => String(value).toLowerCase().includes(q)));
  }, [query, rows]);

  if (allowed === null && !error) return <PageLoading />;
  if (!allowed) return <div className="mx-auto max-w-4xl px-4 py-8 md:px-6"><div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink-muted">{error ?? 'Owner view is required for the sensitive access audit.'}</div></div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-7 md:px-6 md:py-8">
      <StaffControlHeader role="owner" active="activity" />
      <section className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-faint"><ShieldCheck size={14} /> Privacy & access audit</div>
            <h1 className="mt-2 text-xl font-semibold text-ink">Sensitive Owner actions</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-muted">Deep account inspection and high-impact account changes leave a permanent audit trail here. Routine moderation updates stay in the main Activity workspace.</p>
          </div>
          <a href={appPageUrl('/admin/activity')} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-xs font-medium text-ink hover:bg-canvas"><ArrowLeft size={14} />All activity</a>
        </div>

        <label className="mt-5 flex min-h-11 items-center gap-2 rounded-xl border border-border bg-canvas px-3">
          <Search size={15} className="text-ink-faint" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search actor, account, or action…" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <AuditMetric label="Sensitive events" value={rows.length} />
          <AuditMetric label="Account inspections" value={rows.filter((row) => row.action === 'inspect_user_account').length} />
          <AuditMetric label="High-impact changes" value={rows.filter((row) => row.action !== 'inspect_user_account').length} />
        </div>

        {filtered.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-ink-muted">No sensitive activity matches that search.</div>
        ) : (
          <ol className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {filtered.map((row) => (
              <li key={row.id} className="flex gap-3 px-4 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink-muted">{row.action === 'inspect_user_account' ? <Eye size={16} /> : <ShieldCheck size={16} />}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <p className="text-sm font-medium text-ink">{actionLabel(row.action)}</p>
                    <time className="shrink-0 text-[11px] text-ink-faint">{new Date(row.created_at).toLocaleString()}</time>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted"><span className="font-medium text-ink">{row.actor_name ?? row.actor_email ?? 'Unknown staff'}</span>{row.target_name || row.target_email ? <> → {row.target_name ?? row.target_email}</> : null}</p>
                  {row.action === 'inspect_user_account' && <p className="mt-2 text-xs leading-5 text-ink-faint">Deep account metadata was viewed. This does not mean private message bodies were opened.</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function isSensitiveAction(action: string) {
  const normalized = action.toLowerCase();
  return normalized === 'inspect_user_account'
    || normalized.includes('role')
    || normalized.includes('ban')
    || normalized.includes('delete')
    || normalized.includes('sign_out')
    || normalized.includes('force_sign')
    || normalized.includes('owner_user_note')
    || normalized.includes('privacy')
    || normalized.includes('export');
}

function actionLabel(action: string) {
  if (action === 'inspect_user_account') return 'Deep account inspection';
  return action.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function AuditMetric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-border bg-canvas p-3"><div className="text-xl font-semibold text-ink">{value.toLocaleString()}</div><div className="mt-1 text-[11px] text-ink-muted">{label}</div></div>;
}
