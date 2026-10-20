'use client';

import { Palette } from 'lucide-react';

/** Global appearance is owned by ARROW OS. No second Relay-specific theme picker. */
export function ExperienceMenu({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const openAppearance = () => {
    const arrow = (window as typeof window & {
      ArrowOS?: { openPanel: (name: string, module: string) => void }
    }).ArrowOS;
    if (arrow?.openPanel) {
      arrow.openPanel('appearance', 'relay');
      onOpenChange?.(true);
      return;
    }
    // ARROW OS may still be loading. Avoid silently opening an unrelated
    // second experience system, which previously led to conflicting settings.
    window.dispatchEvent(new CustomEvent('arrow-os:open-panel', { detail: { panel: 'appearance', module: 'relay' } }));
  };
  return <button type="button" onClick={openAppearance} aria-label="ARROW appearance" title="ARROW appearance"
    className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink md:h-9 md:w-9 md:rounded-md">
    <Palette size={18} />
  </button>;
}
