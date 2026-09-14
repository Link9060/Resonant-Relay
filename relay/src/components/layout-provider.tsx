'use client';

import { DEFAULT_LAYOUT, LAYOUT_EVENT, LAYOUT_KEY, normalizeLayout } from '@/lib/layout-mode';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(min-width: 768px)');

    const apply = () => {
      if (!media.matches) {
        delete root.dataset.relayLayout;
        return;
      }
      let layout = DEFAULT_LAYOUT;
      try { layout = normalizeLayout(window.localStorage.getItem(LAYOUT_KEY)); } catch { /* ignore */ }
      root.dataset.relayLayout = layout;
    };

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === LAYOUT_KEY) apply();
    };
    const onLayout = () => apply();

    apply();
    // Route transitions can briefly rebuild app chrome. Reassert the persisted
    // desktop layout after the next paint so Planner/Calendar/etc. cannot fall
    // back to the Classic sidebar while the rest of the app keeps another mode.
    const routeFrame = window.requestAnimationFrame(apply);
    media.addEventListener('change', apply);
    window.addEventListener('storage', onStorage);
    window.addEventListener(LAYOUT_EVENT, onLayout);
    window.addEventListener('pageshow', apply);
    return () => {
      window.cancelAnimationFrame(routeFrame);
      media.removeEventListener('change', apply);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LAYOUT_EVENT, onLayout);
      window.removeEventListener('pageshow', apply);
    };
  }, [pathname]);

  return children;
}
