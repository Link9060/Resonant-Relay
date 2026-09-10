'use client';

import { APP_TITLE, appPageUrl, appPathname, BASE_PATH, IS_BETA, RELEASE_LABEL } from '@/lib/config';
import { cn } from '@/lib/utils';
import { CalendarDays, ChevronLeft, ChevronRight, House, Link2, ListTodo, Mail, MessageCircle, Settings, Shield, ShieldCheck, SquareCheck, Users, type LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

const DESKTOP_DOCK_ITEMS = [
  { href: '/', label: 'Dashboard', mobileLabel: 'Home', icon: House },
  { href: '/chats', label: 'Chats', icon: MessageCircle },
  { href: '/todo', label: 'To Do', icon: ListTodo },
  { href: '/planner', label: 'Planner', mobileLabel: 'Plans', icon: SquareCheck },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/email', label: 'Email', icon: Mail },
  { href: '/quicklinks', label: 'Quick Links', icon: Link2 },
] as const;

type AppRole = 'user' | 'moderator' | 'admin' | 'owner';

export function Dock({
  role = 'user',
  collapsed = false,
  onCollapsedChange,
}: {
  role?: AppRole;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const currentPath = appPathname(pathname);
  const canOpenStaff = role !== 'user';
  const mobileItems: Array<{ href: string; label: string; mobileLabel?: string; icon: LucideIcon }> = canOpenStaff
    ? [
        { href: '/', label: 'Dashboard', mobileLabel: 'Home', icon: House },
        { href: '/chats', label: 'Chats', icon: MessageCircle },
        { href: '/admin/moderation', label: 'Reports', icon: ShieldCheck },
        { href: '/contacts', label: 'Contacts', icon: Users },
        { href: '/profile', label: 'Settings', icon: Settings },
      ]
    : [
        { href: '/', label: 'Dashboard', mobileLabel: 'Home', icon: House },
        { href: '/chats', label: 'Chats', icon: MessageCircle },
        { href: '/contacts', label: 'Contacts', icon: Users },
        { href: '/profile', label: 'Settings', icon: Settings },
      ];

  return (
    <>
      <nav
        aria-label="Main"
        className={cn(
          'relay-desktop-dock fixed inset-y-0 left-0 z-30 hidden flex-col overflow-y-auto border-r border-border bg-surface py-6 transition-[width,padding] duration-200 md:flex',
          collapsed ? 'w-16 px-2' : 'w-60 px-3'
        )}
      >
        <a
          href={appPageUrl(IS_BETA ? '/space' : '/')}
          className={cn(
            'relay-brand-lockup pb-8 font-display text-lg font-medium tracking-tight text-ink',
            collapsed ? 'justify-center px-0' : 'px-3'
          )}
          aria-label={IS_BETA ? 'Return to particle landing page' : `${APP_TITLE} home`}
          title={collapsed ? APP_TITLE : undefined}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BASE_PATH}/relay-icon.svg`} alt="" className="h-7 w-7 shrink-0 dark:invert" />
          {!collapsed && (
            <>
              <span>Relay</span>
              <span
                className={cn(
                  'rounded-full border px-1.5 py-0.5 text-[9px] font-medium leading-none tracking-normal',
                  IS_BETA
                    ? 'border-ink-muted bg-ink text-canvas'
                    : 'border-border bg-surface-raised text-ink-faint'
                )}
              >
                {RELEASE_LABEL}
              </span>
            </>
          )}
        </a>

        <ul className="flex flex-1 flex-col gap-1">
          {DESKTOP_DOCK_ITEMS.map((item) => (
            <DockLink
              key={item.href}
              item={item}
              active={isDockPathActive(currentPath, item.href)}
              variant="rail"
              collapsed={collapsed}
            />
          ))}
        </ul>

        <ul className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          {canOpenStaff && (
            <DockLink
              item={{ href: '/admin', label: staffConsoleLabel(role), icon: Shield }}
              active={isDockPathActive(currentPath, '/admin')}
              variant="rail"
              collapsed={collapsed}
            />
          )}
          <DockLink
            item={{ href: '/contacts', label: 'Contacts', icon: Users }}
            active={isDockPathActive(currentPath, '/contacts')}
            variant="rail"
            collapsed={collapsed}
          />
        </ul>

        <div className="mt-3 border-t border-border pt-3">
          <button
            type="button"
            onClick={() => onCollapsedChange?.(!collapsed)}
            className={cn(
              'relay-dock-link flex w-full items-center rounded-md py-2 text-sm text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink',
              collapsed ? 'justify-center px-0' : 'gap-3 px-3'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : undefined}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </nav>

      <nav
        aria-label="Relay Mobile"
        className={cn(
          'relay-mobile-nav fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface/95 backdrop-blur-xl md:hidden',
          canOpenStaff ? 'grid-cols-5' : 'grid-cols-4'
        )}
      >
        {mobileItems.map((item) => (
          <DockLink key={item.href} item={item} active={isDockPathActive(currentPath, item.href)} variant="tab" />
        ))}
      </nav>
    </>
  );
}

function DockLink({
  item,
  active,
  variant,
  collapsed = false,
}: {
  item: { href: string; label: string; mobileLabel?: string; icon: LucideIcon };
  active: boolean;
  variant: 'rail' | 'tab';
  collapsed?: boolean;
}) {
  const Icon = item.icon;

  if (variant === 'tab') {
    return (
      <a
        href={appPageUrl(item.href)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relay-dock-link flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors',
          active ? 'text-ink' : 'text-ink-faint'
        )}
      >
        <Icon size={20} />
        <span className="max-w-full truncate">{item.mobileLabel ?? item.label}</span>
      </a>
    );
  }

  return (
    <li>
      <a
        href={appPageUrl(item.href)}
        aria-current={active ? 'page' : undefined}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
        className={cn(
          'relay-dock-link flex items-center rounded-md py-2 text-sm transition-colors',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3',
          active ? 'bg-surface-raised text-ink' : 'text-ink-muted'
        )}
      >
        <Icon size={18} className="shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </a>
    </li>
  );
}

function staffConsoleLabel(role: AppRole) {
  if (role === 'owner') return '◆ Owner Control';
  if (role === 'admin') return '◇ Admin Control';
  return '● Moderator';
}

function isDockPathActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
