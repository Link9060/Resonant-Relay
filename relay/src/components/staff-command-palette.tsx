'use client';

import { appPageUrl } from '@/lib/config';
import type { AppRole } from '@/lib/role-preview';
import {
  Activity,
  ArrowRight,
  BarChart3,
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

export type StaffRole = Exclude<AppRole, 'user'>;
export type StaffSection = 'overview' | 'requests' | 'support' | 'users' | 'moderation' | 'beta' | 'analytics' | 'system' | 'activity';

type StaffCommand = {
  id: StaffSection;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  roles: StaffRole[];
};

export const STAFF_COMMAND_EVENT = 'relay:staff-command-palette';

export const STAFF_COMMANDS: StaffCommand[] = [
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

export function isStaffRole(role: AppRole): role is StaffRole {
  return role === 'moderator' || role === 'admin' || role === 'owner';
}

export function openStaffCommandPalette() {
  window.dispatchEvent(new Event(STAFF_COMMAND_EVENT));
}

export function StaffCommandPaletteGlobal({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const staff = isStaffRole(role);

  useEffect(() => {
    if (!staff) return;

    const openPalette = () => {
      setQuery('');
      setOpen(true);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuery('');
        setOpen((current) => !current);
        return;
      }
      if (event.key === 'Escape') setOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(STAFF_COMMAND_EVENT, openPalette);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(STAFF_COMMAND_EVENT, openPalette);
    };
  }, [staff]);

  useEffect(() => {
    if (!staff) {
      setOpen(false);
      setQuery('');
    }
  }, [staff]);

  const commands = useMemo(() => {
    if (!staff) return [];
    const available = STAFF_COMMANDS.filter((item) => item.roles.includes(role));
    const normalized = query.trim().toLowerCase();
    if (!normalized) return available;
    return available.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(normalized));
  }, [query, role, staff]);

  if (!staff || !open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-canvas/70 px-4 pt-[12vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Relay staff commands" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={17} className="shrink-0 text-ink-faint" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search staff commands…" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" />
          <button type="button" onClick={() => setOpen(false)} aria-label="Close command palette" className="rounded-md p-1.5 text-ink-faint hover:bg-surface-raised hover:text-ink"><X size={15} /></button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          <div className="px-2 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">{role === 'owner' ? 'Owner commands' : role === 'admin' ? 'Admin commands' : 'Moderator commands'}</div>
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
          <span>Role-gated staff access</span>
          <span>⌘K / Ctrl+K · ESC to close</span>
        </div>
      </div>
    </div>
  );
}
