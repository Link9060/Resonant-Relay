'use client';

import {
  DEFAULT_EXPERIENCE,
  DEFAULT_INTENSITY,
  DEFAULT_LOCK_IN,
  DEFAULT_PALETTE,
  applyExperience,
  EXPERIENCE_EVENT,
  readExperience,
} from '@/lib/experience-mode';
import { useEffect } from 'react';

export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const clearSlatePointer = () => {
      const dock = document.querySelector<HTMLElement>('.relay-desktop-dock');
      if (!dock) return;
      delete dock.dataset.slateHover;
      dock.style.removeProperty('--slate-pointer-y');
    };

    const apply = () => {
      const ready = document.documentElement.dataset.relayVisualPrefsReady === 'true';
      const current = ready
        ? readExperience()
        : { experience: DEFAULT_EXPERIENCE, palette: DEFAULT_PALETTE, intensity: DEFAULT_INTENSITY, lockIn: DEFAULT_LOCK_IN };
      applyExperience(current.experience, current.palette, current.intensity, current.lockIn);
      if (current.experience !== 'slate') clearSlatePointer();
    };

    const trackSlatePointer = (event: PointerEvent) => {
      if (document.documentElement.dataset.relayExperience !== 'slate' || window.innerWidth < 768) {
        clearSlatePointer();
        return;
      }

      const dock = document.querySelector<HTMLElement>('.relay-desktop-dock');
      const cluster = dock?.querySelector<HTMLElement>('.relay-primary-cluster');
      if (!dock || !cluster) return;

      const dockRect = dock.getBoundingClientRect();
      const clusterRect = cluster.getBoundingClientRect();
      const inside = event.clientX >= dockRect.left
        && event.clientX <= dockRect.right
        && event.clientY >= clusterRect.top
        && event.clientY <= clusterRect.bottom;

      if (!inside) {
        delete dock.dataset.slateHover;
        return;
      }

      const y = Math.max(clusterRect.top + 21, Math.min(clusterRect.bottom - 21, event.clientY)) - dockRect.top;
      dock.style.setProperty('--slate-pointer-y', `${y}px`);
      dock.dataset.slateHover = 'true';
    };

    apply();
    window.addEventListener(EXPERIENCE_EVENT, apply);
    window.addEventListener('storage', apply);
    window.addEventListener('pointermove', trackSlatePointer, { passive: true });
    window.addEventListener('blur', clearSlatePointer);
    return () => {
      window.removeEventListener(EXPERIENCE_EVENT, apply);
      window.removeEventListener('storage', apply);
      window.removeEventListener('pointermove', trackSlatePointer);
      window.removeEventListener('blur', clearSlatePointer);
    };
  }, []);
  return children;
}
