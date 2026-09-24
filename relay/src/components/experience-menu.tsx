'use client';

import { ExperienceControls } from '@/components/profile/experience-controls';
import { EXPERIENCE_EVENT, readExperience, type RelayExperience } from '@/lib/experience-mode';
import { Palette } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function ExperienceMenu({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [experience, setExperience] = useState<RelayExperience>('flow');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setExperience(readExperience().experience);
    sync();
    window.addEventListener(EXPERIENCE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EXPERIENCE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  useEffect(() => {
    onOpenChange?.(open);
  }, [onOpenChange, open]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const isStill = experience === 'still';
  const label = isStill ? 'Still — change Relay experience' : 'Relay Experience';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={label}
        className={`flex h-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink md:h-9 md:rounded-md ${isStill ? 'relay-experience-menu-trigger-still w-auto gap-2 px-2.5 text-xs font-medium' : 'w-10 md:w-9'}`}
      >
        <Palette size={isStill ? 15 : 18} />
        {isStill && <span>Still</span>}
      </button>

      {open && (
        <div
          className="relay-popover relay-experience-popover fixed left-3 right-3 top-16 z-50 mx-auto rounded-2xl border border-border bg-canvas p-2 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-11"
          role="dialog"
          aria-label="Relay Experience"
        >
          <ExperienceControls />
        </div>
      )}
    </div>
  );
}
