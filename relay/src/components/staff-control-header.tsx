'use client';

import { appPageUrl } from '@/lib/config';
import { AppRole } from '@/lib/role-preview';
import { cn } from '@/lib/utils';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bug,
  Gauge,
  Inbox,
  Settings2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

type StaffRole = Exclude<AppRole, 'user'>;
export type StaffSection = 'overview' | 'requests' | 'users' | 'moderation' | 'analytics' | 'system' | 'activity';

type NavItem = {
  id: StaffSection;
  label: string;
  icon: LucideIcon;
  href: string;
  roles: StaffRole[];
};

const ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: Gauge, href: '/admin?section=overview', roles: ['moderator', 'admin', 'owner'] },
  { id: 'requests', label: 'Requests', icon: Inbox, href: '/admin/requests', roles: ['moderator', 'admin', 'owner'] },
  { id: 'users', label: 'Users', icon: Users, href: '/admin?section=users', roles: ['admin', 'owner'] },
  { id: 'moderation', label: 'Moderation', icon: ShieldCheck, href: '/admin?section=moderation', roles: ['moderator', 'admin', 'owner'] },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/admin?section=analytics', roles: ['owner'] },
  { id: 'system', label: 'System', icon: Settings2, href: '/admin?section=system', roles: ['owner'] },
  { id: 'activity', label: 'Activity', icon: Activity, href: '/admin?section=activity', roles: ['owner'] },
];

export function StaffControlHeader({ role, active }: { role: StaffRole; active: StaffSection }) {
  const roleCopy = role === 'owner'
    ? { label: 'Owner', access: 'Full Control', mark: '◆' }
    : role === 'admin'
      ? { label: 'Admin', access: 'Operations', mark: '◇' }
      : { label: 'Moderator', access: 'Moderation', mark: '●' };

  const visibleItems = ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:28px_28px]" />
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

          <div className="shrink-0 rounded-xl border border-border bg-canvas/80 px-4 py-3 text-left sm:text-right">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Access level</div>
            <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-ink sm:justify-end">
              <ShieldCheck size={15} />
              {roleCopy.access}
            </div>
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
    </>
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
