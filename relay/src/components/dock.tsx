'use client';

import { appPageUrl, appPathname } from '@/lib/config';
import { cn } from '@/lib/utils';
import { CalendarDays, House, ListTodo, Mail, MessageCircle, SquareCheck, Users, type LucideIcon } from 'lucide-react';
import { usePathname } from 'next/navigation';

const DOCK_ITEMS = [
  { href: '/', label: 'Dashboard', mobileLabel: 'Home', icon: House },
  { href: '/chats', label: 'Chats', icon: MessageCircle },
  { href: '/todo', label: 'To Do', icon: ListTodo },
  { href: '/planner', label: 'Planner', mobileLabel: 'Plans', icon: SquareCheck },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/email', label: 'Email', icon: Mail },
] as const;

export function Dock() {
  const pathname = usePathname();
  const currentPath = appPathname(pathname);

  return (
    <>
      {/* Desktop: a persistent rail that never scrolls away with page content. */}
      <nav
        aria-label="Main"
        className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col overflow-y-auto border-r border-border bg-surface px-3 py-6 md:flex"
      >
        <a href={appPageUrl('/')} className="px-3 pb-8 font-display text-lg font-medium tracking-tight text-ink">
          Relay
        </a>
        <ul className="flex flex-1 flex-col gap-1">
          {DOCK_ITEMS.map((item) => (
            <DockLink key={item.href} item={item} active={isDockPathActive(currentPath, item.href)} variant="rail" />
          ))}
        </ul>
        <ul className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <DockLink
            item={{ href: '/contacts', label: 'Contacts', icon: Users }}
            active={isDockPathActive(currentPath, '/contacts')}
            variant="rail"
          />
        </ul>
      </nav>

      {/* Mobile: all daily tools stay one tap away. Contacts and Add Friend
          remain together in the top bar. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border bg-surface/95 backdrop-blur md:hidden"
      >
        {DOCK_ITEMS.map((item) => (
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
}: {
  item: { href: string; label: string; mobileLabel?: string; icon: LucideIcon };
  active: boolean;
  variant: 'rail' | 'tab';
}) {
  const Icon = item.icon;

  if (variant === 'tab') {
    return (
      <a
        href={appPageUrl(item.href)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relay-dock-link flex min-w-0 flex-col items-center gap-1 rounded-md py-2.5 text-[10px] transition-colors',
          active ? 'text-ink' : 'text-ink-faint'
        )}
      >
        <Icon size={20} />
        <span className="truncate">{item.mobileLabel ?? item.label}</span>
      </a>
    );
  }

  return (
    <li>
      <a
        href={appPageUrl(item.href)}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relay-dock-link flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          active ? 'bg-surface-raised text-ink' : 'text-ink-muted'
        )}
      >
        <Icon size={18} />
        {item.label}
      </a>
    </li>
  );
}

function isDockPathActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
