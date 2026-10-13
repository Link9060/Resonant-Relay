'use client';

import { ExperienceControls } from '@/components/profile/experience-controls';
import { BASE_PATH, appPageUrl } from '@/lib/config';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const SHORTCUTS = [
  { key: 'Space', label: 'Dashboard', href: '/' },
  { key: 'C', label: 'Chats', href: '/chats' },
  { key: 'T', label: 'To Do', href: '/todo' },
  { key: 'N', label: 'Notes', href: '/notes' },
  { key: 'P', label: 'Planner', href: '/planner' },
  { key: 'K', label: 'Calendar', href: '/calendar' },
  { key: 'L', label: 'Quick Links', href: '/quicklinks' },
  { key: 'F', label: 'Contacts', href: '/contacts' },
  { key: ',', label: 'Settings', href: '/profile' },
] as const;

function isInteractiveTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  if (element.isContentEditable) return true;
  return Boolean(element.closest('input, textarea, select, button, a[href], [role="button"], [role="menuitem"], [role="option"], [role="tab"]'));
}

export function StillShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [desktopActive, setDesktopActive] = useState(false);

  const shortcutMap = useMemo(() => new Map(SHORTCUTS.map((item) => [item.key.toLowerCase(), item.href])), []);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    const sync = () => {
      const desktop = media.matches;
      setDesktopActive(desktop);
      if (!desktop) {
        setHelpOpen(false);
        setExperienceOpen(false);
      }
    };
    const initialFrame = window.requestAnimationFrame(sync);
    media.addEventListener('change', sync);
    return () => {
      window.cancelAnimationFrame(initialFrame);
      media.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    if (!desktopActive) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      if (event.key === 'Escape') {
        if (helpOpen || experienceOpen) {
          event.preventDefault();
          event.stopImmediatePropagation();
          setHelpOpen(false);
          setExperienceOpen(false);
        }
        return;
      }
      if (isInteractiveTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.shiftKey && event.key !== '?') return;
      if (document.querySelector('[role="dialog"][aria-modal="true"],dialog[open],.arrow-os-panel[data-open="true"]')) return;

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
        const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
        const arrow = (window as Window & { ArrowOS?: { applyTheme: (theme: string, save: boolean) => void } }).ArrowOS;
        if (arrow) arrow.applyTheme(next, true);
        else {
          document.documentElement.classList.toggle('dark', next === 'dark');
          try { localStorage.setItem('relay-theme', next); localStorage.setItem('arrow_os_theme_v1', next); } catch { /* Theme still changes without storage. */ }
        }
        return;
      }

      const lookup = event.code === 'Space' ? 'space' : event.key.toLowerCase();
      const href = shortcutMap.get(lookup);
      if (!href) return;
      event.preventDefault();
      setHelpOpen(false);
      setExperienceOpen(false);
      const appHref = appPageUrl(href);
      router.push(appHref.startsWith(BASE_PATH) ? appHref.slice(BASE_PATH.length) || '/' : appHref);
    };

    const closeLocalOverlays = () => { setHelpOpen(false); setExperienceOpen(false); };
    window.addEventListener('arrow:panelopen', closeLocalOverlays);
    window.addEventListener('keydown', onKeyDown, true);
    return () => { window.removeEventListener('keydown', onKeyDown, true); window.removeEventListener('arrow:panelopen', closeLocalOverlays); };
  }, [desktopActive, helpOpen, experienceOpen, router, shortcutMap]);

  if (!desktopActive) return null;

  return (
    <>
      <button
        type="button"
        className="relay-still-help-trigger"
        aria-label="Show Relay keyboard shortcuts"
        aria-expanded={helpOpen}
        onClick={() => { setHelpOpen((value) => !value); setExperienceOpen(false); }}
      >
        <kbd>?</kbd>
        <span>Keys</span>
      </button>

      {helpOpen && (
        <aside className="relay-still-overlay relay-still-shortcut-card" aria-label="Relay keyboard shortcuts" data-arrow-escape-local>
          <div className="relay-still-overlay-title">Relay shortcuts</div>
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
        <aside className="relay-still-overlay relay-still-experience-card" aria-label="Change Relay experience" data-arrow-escape-local>
          <ExperienceControls />
        </aside>
      )}
    </>
  );
}

