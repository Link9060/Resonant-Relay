'use client';

import { ExperienceControls } from '@/components/profile/experience-controls';
import { Palette } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function ExperienceMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const close = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close); }, []);
  return <div ref={ref} className="relative"><button type="button" onClick={() => setOpen(v => !v)} aria-label="Relay Experience" title="Relay Experience" className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink md:h-9 md:w-9 md:rounded-md"><Palette size={18}/></button>{open && <div className="relay-popover fixed left-3 right-3 top-16 z-50 mx-auto max-h-[75vh] max-w-xl overflow-auto rounded-2xl border border-border bg-canvas p-2 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[34rem]"><ExperienceControls/></div>}</div>;
}
