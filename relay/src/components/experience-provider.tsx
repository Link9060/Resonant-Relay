'use client';

import { applyExperience, EXPERIENCE_EVENT, readExperience } from '@/lib/experience-mode';
import { useEffect } from 'react';

export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const apply = () => { const current = readExperience(); applyExperience(current.experience, current.palette, current.intensity); };
    apply();
    window.addEventListener(EXPERIENCE_EVENT, apply);
    window.addEventListener('storage', apply);
    return () => { window.removeEventListener(EXPERIENCE_EVENT, apply); window.removeEventListener('storage', apply); };
  }, []);
  return children;
}
