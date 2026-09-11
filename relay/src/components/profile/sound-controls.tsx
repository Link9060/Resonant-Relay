'use client';

import { readSoundPreference, writeSoundPreference } from '@/lib/sound-preferences';
import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';

export function SoundControls() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEnabled(readSoundPreference()));
    return () => cancelAnimationFrame(frame);
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    writeSoundPreference(next);
  }

  return (
    <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink-muted">
          {enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </span>
        <div>
          <h3 className="text-sm font-medium text-ink">Interface sounds</h3>
          <p className="mt-1 text-xs leading-5 text-ink-faint">Click, hover, and startup sounds on this device.</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-label="Interface sounds"
        aria-checked={enabled}
        data-relay-sound="none"
        onClick={toggle}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${enabled ? 'border-ink bg-ink' : 'border-border bg-canvas'}`}
      >
        <span className={`absolute top-1 h-[18px] w-[18px] rounded-full transition-transform ${enabled ? 'translate-x-[25px] bg-canvas' : 'translate-x-1 bg-ink-muted'}`} />
        <span className="sr-only">{enabled ? 'Turn interface sounds off' : 'Turn interface sounds on'}</span>
      </button>
    </div>
  );
}
