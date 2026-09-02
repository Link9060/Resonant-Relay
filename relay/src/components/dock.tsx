'use client';

import { cn } from '@/lib/utils';
import { appPageUrl } from '@/lib/config';
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

  return (
    <>
      {/* Desktop: persistent left rail */}
      <nav
        aria-label="Main"
        className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-surface md:px-3 md:py-6"
      >
        <a href={appPageUrl('/')} className="px-3 pb-8 font-display text-lg font-medium tracking-tight text-ink">
          Relay
        </a>
        <ul className="flex flex-1 flex-col gap-1">
          {DOCK_ITEMS.map((item) => (
            <DockLink key={item.href} item={item} active={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)} variant="rail" />
          ))}
        </ul>
        <ul className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
          <DockLink
            item={{ href: '/contacts', label: 'Contacts', icon: Users }}
            active={pathname.startsWith('/contacts')}
            variant="rail"
          />
        </ul>
      </nav>

      {/* Mobile: all daily tools stay one tap away. Contacts and Add Friend
          remain together in the top bar. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-border bg-surface/95 backdrop-blur md:hidden"
      >
        {DOCK_ITEMS.map((item) => (
          <DockLink key={item.href} item={item} active={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)} variant="tab" />
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
        className={cn(
          'flex min-w-0 flex-col items-center gap-1 py-2.5 text-[10px] transition-colors',
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
        className={cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          active ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
        )}
      >
        <Icon size={18} />
        {item.label}
      </a>
    </li>
  );
}
