'use client';

import { InteractiveGrid } from '@/components/interactive-grid';
import { appPageUrl, IS_BETA } from '@/lib/config';
import { AppRole } from '@/lib/role-preview';
import { cn } from '@/lib/utils';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bug,
  Command,
  FlaskConical,
  Gauge,
  Inbox,
  Mail,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type StaffRole = Exclude<AppRole, 'user'>;
export type StaffSection = 'overview' | 'requests' | 'support' | 'users' | 'moderation' | 'beta' | 'analytics' | 'system' | 'activity';

type NavItem = {
  id: StaffSection;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  roles: StaffRole[];
};

const ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', description: 'Open the staff command overview', icon: Gauge, href: '/admin?section=overview', roles: ['moderator', 'admin', 'owner'] },
  { id: 'requests', label: 'Requests', description: 'Review bugs, applications, and feedback', icon: Inbox, href: '/admin/requests', roles: ['moderator', 'admin', 'owner'] },
  { id: 'support', label: 'Support', description: 'Read and reply to support@resonantrelay.org', icon: Mail, href: '/admin/support', roles: ['moderator', 'admin', 'owner'] },
  { id: 'users', label: 'Users', description: 'Search and inspect Relay accounts', icon: Users, href: '/admin/users', roles: ['admin', 'owner'] },
  { id: 'moderation', label: 'Moderation', description: 'Work through the moderation queue', icon: ShieldCheck, href: '/admin/moderation', roles: ['moderator', 'admin', 'owner'] },
  { id: 'beta', label: 'Beta', description: 'Review Beta requests and tester access', icon: FlaskConical, href: '/admin/beta', roles: ['owner'] },
  { id: 'analytics', label: 'Analytics', description: 'Inspect detailed Relay usage metrics', icon: BarChart3, href: '/admin/analytics', roles: ['owner'] },
  { id: 'system', label: 'System', description: 'View verified operational data', icon: Settings2, href: '/admin/system', roles: ['owner'] },
  { id: 'activity', label: 'Activity', description: 'Open the staff activity workspace', icon: Activity, href: '/admin/activity', roles: ['owner'] },
];

export function StaffControlHeader({ role, active }: { role: StaffRole; active: StaffSection }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const roleCopy = role === 'owner'
    ? { label: 'Owner', access: 'Full Control', mark: '◆' }
    : role === 'admin'
      ? { label: 'Admin', access: 'Operations', mark: '◇' }
      : { label: 'Moderator', access: 'Moderation', mark: '●' };

  const visibleItems = ITEMS.filter((item) => item.roles.includes(role));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((current) => !current);
      }
      if (event.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 sm:p-6">
        {IS_BETA ? <InteractiveGrid /> : <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:28px_28px]" />}
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink">
                <span aria-hidden="true">{roleCopy.mark}</span>
                {roleCopy.label}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                Staff access active
              </span>
            </div>
            <h1 className="font-display text-2xl font-medium tracking-tight text-ink sm:text-3xl">Relay Control Center</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-muted">
              {role === 'owner'
                ? 'Operate Relay, review staff activity, manage access, and inspect system-wide usage from one organized workspace.'
                : role === 'admin'
                  ? 'Handle account operations, incoming requests, and escalated moderation from one focused workspace.'
                  : 'Review reports and safety requests without the account and infrastructure controls reserved for higher roles.'}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <div className="rounded-xl border border-border bg-canvas/80 px-4 py-3 text-left sm:text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Access level</div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink sm:justify-end">
                <ShieldCheck size={15} />
                {roleCopy.access}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-canvas/80 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink sm:self-auto"
            >
              <Command size={14} />
              Command Center
              <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-ink-faint">⌘K</span>
            </button>
          </div>
        </div>
      </section>

      <nav aria-label="Control Center" className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface p-1.5">
        <div className="flex min-w-max gap-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={appPageUrl(item.href)}
                aria-current={active === item.id ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                  active === item.id
                    ? 'bg-ink text-canvas'
                    : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
                )}
              >
                <Icon size={14} />
                {item.label}
              </a>
            );
          })}
        </div>
      </nav>

      {paletteOpen && <StaffCommandPalette role={role} onClose={() => setPaletteOpen(false)} />}
    </>
  );
}

function StaffCommandPalette({ role, onClose }: { role: StaffRole; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const commands = useMemo(() => {
    const available = ITEMS.filter((item) => item.roles.includes(role));
    const normalized = query.trim().toLowerCase();
    if (!normalized) return available;
    return available.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(normalized));
  }, [query, role]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-canvas/70 px-4 pt-[12vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Control Center commands" onMouseDown={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={17} className="shrink-0 text-ink-faint" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Control Center…" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" />
          <button type="button" onClick={onClose} aria-label="Close command palette" className="rounded-md p-1.5 text-ink-faint hover:bg-surface-raised hover:text-ink"><X size={15} /></button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Navigate</div>
          {commands.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-ink-muted">No staff commands match that search.</div>
          ) : commands.map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.id} href={appPageUrl(item.href)} className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface-raised">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-canvas text-ink-muted"><Icon size={16} /></span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-ink">{item.label}</span><span className="mt-0.5 block truncate text-xs text-ink-muted">{item.description}</span></span>
                <ArrowRight size={14} className="text-ink-faint" />
              </a>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-[10px] text-ink-faint">
          <span>{role === 'owner' ? 'Owner command access' : role === 'admin' ? 'Admin command access' : 'Moderator command access'}</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}

export function StaffRequestsShortcut({ openReports }: { openReports?: number }) {
  const ariaLabel = openReports == null ? 'Open requests inbox' : `Open requests inbox; ${openReports} moderation reports open`;
  return (
    <a aria-label={ariaLabel} href={appPageUrl('/admin/requests')} className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-surface-raised">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-ink"><Inbox size={15} /> Requests inbox</div>
        <p className="mt-1 text-xs leading-5 text-ink-muted">Bug reports, role applications, feature ideas, and routed support requests live here.</p>
      </div>
      <ArrowRight className="shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" size={15} />
    </a>
  );
}

export function StaffBugHint() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-canvas px-4 py-3 text-xs text-ink-muted">
      <Bug className="mt-0.5 shrink-0 text-ink-faint" size={14} />
      <span>Form-backed submissions now have a dedicated Requests workspace instead of competing with dashboard stats.</span>
    </div>
  );
}
