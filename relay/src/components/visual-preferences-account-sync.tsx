'use client';

import { EXPERIENCE_EVENT } from '@/lib/experience-mode';
import { LAYOUT_EVENT } from '@/lib/layout-mode';
import { persistActiveVisualPreferences, visualPreferencesReady } from '@/lib/visual-preferences-account';
import { useEffect } from 'react';

const SAVE_DELAY_MS = 350;

export function VisualPreferencesAccountSync({ userId }: { userId: string }) {
  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const save = () => {
      if (!active || !visualPreferencesReady()) return;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        if (active) void persistActiveVisualPreferences(userId);
      }, SAVE_DELAY_MS);
    };

    window.addEventListener(LAYOUT_EVENT, save);
    window.addEventListener(EXPERIENCE_EVENT, save);
    return () => {
      active = false;
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener(LAYOUT_EVENT, save);
      window.removeEventListener(EXPERIENCE_EVENT, save);
    };
  }, [userId]);

  return null;
}
