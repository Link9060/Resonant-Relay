'use client';

import { DEFAULT_LAYOUT, LAYOUT_EVENT, LAYOUT_KEY, normalizeLayout } from '@/lib/layout-mode';
import { useEffect } from 'react';

export function LayoutProvider({ children }: { children: React.ReactNode }) {
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
    media.addEventListener('change', apply);
    window.addEventListener('storage', onStorage);
    window.addEventListener(LAYOUT_EVENT, onLayout);
    return () => {
      media.removeEventListener('change', apply);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LAYOUT_EVENT, onLayout);
    };
  }, []);

  return children;
}
