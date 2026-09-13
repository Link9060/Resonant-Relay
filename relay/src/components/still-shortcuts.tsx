'use client';

import { ExperienceControls } from '@/components/profile/experience-controls';
import { DASHBOARD_PATH, appPageUrl } from '@/lib/config';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const SHORTCUTS = [
  { key: 'Space', label: 'Dashboard', href: DASHBOARD_PATH },
  { key: 'C', label: 'Chats', href: '/chats' },
  { key: 'T', label: 'To Do', href: '/todo' },
  { key: 'N', label: 'Notes', href: '/notes' },
  { key: 'P', label: 'Planner', href: '/planner' },
  { key: 'K', label: 'Calendar', href: '/calendar' },
  { key: 'E', label: 'Email', href: '/email' },
  { key: 'L', label: 'Quick Links', href: '/quicklinks' },
  { key: 'F', label: 'Contacts', href: '/contacts' },
  { key: ',', label: 'Settings', href: '/profile' },
] as const;

function isTypingTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  return element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName);
}

export function StillShortcuts() {
  const router = useRouter();
  const pathname = usePathname();
  const [helpOpen, setHelpOpen] = useState(false);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [active, setActive] = useState(false);

  const shortcutMap = useMemo(() => new Map(SHORTCUTS.map((item) => [item.key.toLowerCase(), item.href])), []);

  useEffect(() => {
    const sync = () => setActive(document.documentElement.dataset.relayExperience === 'still' && window.matchMedia('(min-width: 768px)').matches);
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-relay-experience'] });
    const media = window.matchMedia('(min-width: 768px)');
    media.addEventListener('change', sync);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setHelpOpen(false);
      setExperienceOpen(false);
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'Escape') {
        setHelpOpen(false);
        setExperienceOpen(false);
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        setHelpOpen((value) => !value);
        setExperienceOpen(false);
        return;
      }

      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        setExperienceOpen((value) => !value);
        setHelpOpen(false);
        return;
      }

      if (event.key.toLowerCase() === 'd') {
        event.preventDefault();
        const next = !document.documentElement.classList.contains('dark');
        document.documentElement.classList.toggle('dark', next);
        try { localStorage.setItem('relay-theme', next ? 'dark' : 'light'); } catch { /* Theme still changes without storage. */ }
        return;
      }

      const lookup = event.code === 'Space' ? 'space' : event.key.toLowerCase();
      const href = shortcutMap.get(lookup);
      if (!href) return;
      event.preventDefault();
      router.push(appPageUrl(href).replace(/^https?:\/\/[^/]+/, ''));
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, router, shortcutMap]);

  if (!active) return null;

  return (
    <>
      <button
        type="button"
        className="relay-still-help-trigger"
        aria-label="Show Still keyboard shortcuts"
        aria-expanded={helpOpen}
        onClick={() => { setHelpOpen((value) => !value); setExperienceOpen(false); }}
      >
        ?
      </button>

      <div className="relay-still-location" aria-hidden="true">
        {pathname.replace(/\/$/, '') === '/space' ? 'Resonant Relay' : ''}
      </div>

      {helpOpen && (
        <aside className="relay-still-overlay relay-still-shortcut-card" aria-label="Still shortcuts">
          <div className="relay-still-overlay-title">Shortcuts</div>
          <div className="relay-still-shortcut-list">
            {SHORTCUTS.map((item) => <div key={item.key} className="relay-still-shortcut-row"><kbd>{item.key}</kbd><span>{item.label}</span></div>)}
            <div className="relay-still-shortcut-row"><kbd>D</kbd><span>Light / dark</span></div>
            <div className="relay-still-shortcut-row"><kbd>M</kbd><span>Change experience</span></div>
            <div className="relay-still-shortcut-row"><kbd>?</kbd><span>Shortcuts</span></div>
            <div className="relay-still-shortcut-row"><kbd>Esc</kbd><span>Close</span></div>
          </div>
        </aside>
      )}

      {experienceOpen && (
        <aside className="relay-still-overlay relay-still-experience-card" aria-label="Change Relay experience">
          <ExperienceControls />
        </aside>
      )}
    </>
  );
}
