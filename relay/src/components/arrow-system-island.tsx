'use client';

import { ExperienceMenu } from '@/components/experience-menu';
import { OrbitReturnButton } from '@/components/orbit-return-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { appPageUrl, appPathname } from '@/lib/config';
import type { Profile } from '@/lib/types/database';
import { CalendarDays, ListTodo, NotebookPen, TimerReset } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const SYSTEM_ROUTES = [
  { href: '/notes', label: 'Notes', icon: NotebookPen },
  { href: '/todo', label: 'Tasks', icon: ListTodo },
  { href: '/focus', label: 'Focus', icon: TimerReset },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
] as const;

export function ArrowSystemIsland({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const currentPath = appPathname(pathname);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPinned(false);
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setPinned(false);
      setOpen(false);
      rootRef.current?.querySelector<HTMLButtonElement>('.arrow-system-trigger')?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function closeIfIdle() {
    if (!pinned) setOpen(false);
  }

  function handleBlur() {
    window.requestAnimationFrame(() => {
      if (!pinned && rootRef.current && !rootRef.current.contains(document.activeElement)) {
        setOpen(false);
      }
    });
  }

  function togglePinned() {
    const next = !pinned;
    setPinned(next);
    setOpen(next || !open);
  }

  return (
    <div className="arrow-system-island-anchor">
      <div
        ref={rootRef}
        className="arrow-system-island"
        data-open={open ? 'true' : 'false'}
        data-pinned={pinned ? 'true' : 'false'}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={closeIfIdle}
        onFocusCapture={() => setOpen(true)}
        onBlurCapture={handleBlur}
      >
        <div className="arrow-system-island-content" aria-hidden={!open}>
          <OrbitReturnButton variant="island" />

          <span className="arrow-system-divider" aria-hidden="true" />

          {SYSTEM_ROUTES.map(({ href, label, icon: Icon }) => {
            const active = currentPath === href || currentPath.startsWith(`${href}/`);
            return (
              <a
                key={href}
                href={appPageUrl(href)}
                className="arrow-system-control arrow-system-route"
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                title={label}
              >
                <Icon size={16} />
                <span>{label}</span>
              </a>
            );
          })}

          <span className="arrow-system-divider" aria-hidden="true" />

          <div className="arrow-system-native-control" title="Experience and color">
            <ExperienceMenu />
          </div>
          <div className="arrow-system-native-control">
            <ThemeToggle />
          </div>

          <a
            href={appPageUrl('/profile')}
            className="arrow-system-profile"
            aria-label="ARROW settings and profile"
            aria-current={currentPath === '/profile' ? 'page' : undefined}
            title="Settings and profile"
          >
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" />
            ) : (
              <span>{profile?.display_name?.[0]?.toUpperCase() ?? '?'}</span>
            )}
          </a>

          <span className="arrow-system-divider arrow-system-brand-divider" aria-hidden="true" />
          <span className="arrow-system-name" aria-hidden="true">ARROW</span>
        </div>

        <button
          type="button"
          className="arrow-system-trigger"
          onClick={togglePinned}
          aria-label={open ? 'Close ARROW controls' : 'Open ARROW controls'}
          aria-expanded={open}
          title="ARROW"
        >
          <span className="arrow-system-mark" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
