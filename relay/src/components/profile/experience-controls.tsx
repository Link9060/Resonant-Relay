'use client';

import {
  DEFAULT_EXPERIENCE,
  DEFAULT_INTENSITY,
  DEFAULT_PALETTE,
  EXPERIENCE_EVENT,
  EXPERIENCE_KEY,
  INTENSITY_KEY,
  PALETTE_KEY,
  experiences,
  palettes,
  resetExperience,
  saveExperience,
  type RelayExperience,
  type RelayPalette,
} from '@/lib/experience-mode';
import { RotateCcw } from 'lucide-react';
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
  return (localStorage.getItem(EXPERIENCE_KEY) || DEFAULT_EXPERIENCE) as RelayExperience;
}

function getPaletteSnapshot(): RelayPalette {
  return (localStorage.getItem(PALETTE_KEY) || DEFAULT_PALETTE) as RelayPalette;
}

function getIntensitySnapshot() {
  return Math.max(0, Math.min(100, Number(localStorage.getItem(INTENSITY_KEY) || DEFAULT_INTENSITY)));
}

export function ExperienceControls() {
  const experience = useSyncExternalStore(subscribe, getExperienceSnapshot, () => DEFAULT_EXPERIENCE);
  const palette = useSyncExternalStore(subscribe, getPaletteSnapshot, () => DEFAULT_PALETTE);
  const intensity = useSyncExternalStore(subscribe, getIntensitySnapshot, () => DEFAULT_INTENSITY);
  const isDefault = experience === DEFAULT_EXPERIENCE && palette === DEFAULT_PALETTE && intensity === DEFAULT_INTENSITY;

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
          <p className="mt-1 text-xs leading-5 text-ink-faint">Experience changes the shape and motion of Relay. Palette changes the whole interface color system.</p>
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
              className={`rounded-lg border px-2.5 py-2 text-left text-xs ${palette === option.id ? 'border-ink bg-surface-raised' : 'border-border bg-canvas'}`}
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

      <div className="mt-5 border-t border-border pt-4">
        <button
          type="button"
          onClick={resetExperience}
          disabled={isDefault}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-canvas px-3 text-sm font-medium text-ink transition hover:bg-surface-raised disabled:cursor-default disabled:opacity-40"
        >
          <RotateCcw size={15} />
          Reset to Relay defaults
        </button>
        <p className="mt-2 text-center text-[11px] leading-4 text-ink-faint">Resets Experience, Palette, and Visual intensity. Light/dark mode stays unchanged.</p>
      </div>
    </div>
  );
}
