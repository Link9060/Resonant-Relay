'use client';

import { Palette } from 'lucide-react';

/** Compatibility launcher: the retired Relay experience popover is now ARROW Appearance. */
export function ExperienceMenu({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  return <button
    type="button"
    title="ARROW appearance"
    aria-label="Open ARROW appearance"
    className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink md:h-9 md:w-9"
    onClick={event => {
      (window as Window & {
        ArrowOS?: { openPanel: (name: string, module: string, anchor?: HTMLElement) => void };
      }).ArrowOS?.openPanel('appearance', 'relay', event.currentTarget);
      onOpenChange?.(false);
    }}
  ><Palette size={18}/></button>;
}
