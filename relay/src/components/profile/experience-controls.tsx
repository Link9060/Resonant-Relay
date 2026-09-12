'use client';

import {
  EXPERIENCE_EVENT,
  EXPERIENCE_KEY,
  INTENSITY_KEY,
  PALETTE_KEY,
  experiences,
  palettes,
  saveExperience,
  type RelayExperience,
  type RelayPalette,
} from '@/lib/experience-mode';
import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EXPERIENCE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(EXPERIENCE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function getExperienceSnapshot(): RelayExperience {
  return (localStorage.getItem(EXPERIENCE_KEY) || 'relay') as RelayExperience;
}

function getPaletteSnapshot(): RelayPalette {
  return (localStorage.getItem(PALETTE_KEY) || 'monochrome') as RelayPalette;
}

function getIntensitySnapshot() {
  return Math.max(0, Math.min(100, Number(localStorage.getItem(INTENSITY_KEY) || 55)));
}

export function ExperienceControls() {
  const experience = useSyncExternalStore(subscribe, getExperienceSnapshot, () => 'relay' as RelayExperience);
  const palette = useSyncExternalStore(subscribe, getPaletteSnapshot, () => 'monochrome' as RelayPalette);
  const intensity = useSyncExternalStore(subscribe, getIntensitySnapshot, () => 55);

  function update(
    nextExperience: RelayExperience = experience,
    nextPalette: RelayPalette = palette,
    nextIntensity = intensity,
  ) {
    saveExperience(nextExperience, nextPalette, nextIntensity);
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Relay Experience</h3>
          <p className="mt-1 text-xs leading-5 text-ink-faint">Choose how Relay behaves, then make the color system yours.</p>
        </div>
        <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-ink-muted">1.0.4</span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {experiences.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => update(option.id)}
            className={`rounded-xl border p-3 text-left transition ${experience === option.id ? 'border-ink bg-ink text-canvas' : 'border-border bg-canvas text-ink hover:bg-surface-raised'}`}
          >
            <div className="text-sm font-semibold">{option.name}</div>
            <div className={`mt-1 text-xs leading-5 ${experience === option.id ? 'opacity-70' : 'text-ink-faint'}`}>{option.description}</div>
          </button>
        ))}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="text-xs font-medium text-ink-muted">Palette</div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {palettes.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => update(experience, option.id)}
              className={`rounded-lg border px-2.5 py-2 text-left text-xs ${palette === option.id ? 'border-ink' : 'border-border'}`}
            >
              <span className="mb-1.5 flex gap-1">
                {option.swatches.map((color) => <span key={color} className="h-3 w-3 rounded-full border border-black/10" style={{ background: color }} />)}
              </span>
              <span className="text-ink">{option.name}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="mt-5 block border-t border-border pt-4">
        <span className="flex justify-between text-xs font-medium text-ink-muted"><span>Visual intensity</span><span>{intensity}%</span></span>
        <input className="mt-3 w-full accent-current" type="range" min="0" max="100" value={intensity} onChange={(event) => update(experience, palette, Number(event.target.value))} />
        <span className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-ink-faint"><span>Calm</span><span>Expressive</span></span>
      </label>
    </div>
  );
}
