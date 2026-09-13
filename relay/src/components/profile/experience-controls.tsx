'use client';

import {
  DEFAULT_EXPERIENCE,
  DEFAULT_INTENSITY,
  DEFAULT_LOCK_IN,
  DEFAULT_PALETTE,
  EXPERIENCE_EVENT,
  EXPERIENCE_KEY,
  INTENSITY_KEY,
  LOCK_IN_KEY,
  PALETTE_KEY,
  experiences,
  normalizeExperience,
  normalizePalette,
  palettes,
  resetExperience,
  saveExperience,
  saveLockIn,
  type RelayExperience,
  type RelayPalette,
} from '@/lib/experience-mode';
import { Crosshair, RotateCcw } from 'lucide-react';
import { useSyncExternalStore, type CSSProperties } from 'react';

function subscribe(onStoreChange: () => void) {
  window.addEventListener(EXPERIENCE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(EXPERIENCE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

function getExperienceSnapshot(): RelayExperience {
  return normalizeExperience(localStorage.getItem(EXPERIENCE_KEY));
}

function getPaletteSnapshot(): RelayPalette {
  return normalizePalette(localStorage.getItem(PALETTE_KEY));
}

function getIntensitySnapshot() {
  return Math.max(0, Math.min(100, Number(localStorage.getItem(INTENSITY_KEY) || DEFAULT_INTENSITY)));
}

function getLockInSnapshot() {
  return localStorage.getItem(LOCK_IN_KEY) === 'true';
}

export function ExperienceControls() {
  const experience = useSyncExternalStore(subscribe, getExperienceSnapshot, () => DEFAULT_EXPERIENCE);
  const palette = useSyncExternalStore(subscribe, getPaletteSnapshot, () => DEFAULT_PALETTE);
  const intensity = useSyncExternalStore(subscribe, getIntensitySnapshot, () => DEFAULT_INTENSITY);
  const lockIn = useSyncExternalStore(subscribe, getLockInSnapshot, () => DEFAULT_LOCK_IN);
  const isDefault = experience === DEFAULT_EXPERIENCE && palette === DEFAULT_PALETTE && intensity === DEFAULT_INTENSITY && !lockIn;

  function update(
    nextExperience: RelayExperience = experience,
    nextPalette: RelayPalette = palette,
    nextIntensity = intensity,
  ) {
    saveExperience(nextExperience, nextPalette, nextIntensity);
  }

  return (
    <div className="relay-experience-controls w-full rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">Relay Experience</h3>
          <p className="mt-1 text-xs leading-5 text-ink-faint">Choose how Relay moves and feels. Light or dark mode always keeps the interface neutral.</p>
        </div>
        <span className="rounded-full border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-ink-muted">Beta</span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {experiences.map((option) => (
          <button
            key={option.id}
            type="button"
            data-experience-preview={option.id}
            aria-pressed={experience === option.id}
            onClick={() => update(option.id)}
            className="relay-experience-option rounded-xl border border-border bg-canvas p-3 text-left text-ink"
          >
            <span className="flex items-start justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold">{option.name}</span>
                <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[.12em] text-ink-faint">{option.signature}</span>
              </span>
              <span className="relay-mode-preview" aria-hidden="true"><i /><i /><i /></span>
            </span>
            <span className="mt-2 block text-xs leading-5 text-ink-faint">{option.description}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="text-xs font-medium text-ink-muted">Accent color</div>
        <p className="mt-1 text-[11px] leading-4 text-ink-faint">Used only for primary actions, active controls, signals and small animation details.</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {palettes.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={palette === option.id}
              onClick={() => update(experience, option.id)}
              className="relay-accent-option flex items-center gap-2 rounded-lg border border-border bg-canvas px-2.5 py-2 text-left text-xs text-ink"
            >
              <span
                className="relay-accent-swatch h-3.5 w-3.5 shrink-0 rounded-full"
                style={{
                  '--swatch-light-a': option.light,
                  '--swatch-light-b': option.secondaryLight,
                  '--swatch-dark-a': option.dark,
                  '--swatch-dark-b': option.secondaryDark,
                } as CSSProperties}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate">{option.name}</span>
              {option.duo && <span className="text-[8px] font-semibold uppercase tracking-wider text-ink-faint">Duo</span>}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-5 block border-t border-border pt-4">
        <span className="flex justify-between text-xs font-medium text-ink-muted"><span>Visual intensity</span><span>{intensity}%</span></span>
        <input className="relay-experience-intensity mt-3 w-full" style={{ '--particle-fill': `${intensity}%` } as CSSProperties} type="range" min="0" max="100" value={intensity} onChange={(event) => update(experience, palette, Number(event.target.value))} />
        <span className="mt-1 flex justify-between text-[10px] uppercase tracking-wide text-ink-faint"><span>Calm</span><span>Expressive</span></span>
      </label>

      <div className="mt-5 border-t border-border pt-4">
        <button
          type="button"
          aria-pressed={lockIn}
          onClick={() => saveLockIn(!lockIn)}
          className="relay-lock-in-toggle flex w-full items-center gap-3 rounded-xl border border-border bg-canvas p-3 text-left"
        >
          <span className="relay-lock-in-icon grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-ink-muted"><Crosshair size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Lock-In</span>
            <span className="mt-0.5 block text-xs leading-4 text-ink-faint">Hide nonessential motion and attention signals while you focus.</span>
          </span>
          <span className="relay-lock-in-switch" aria-hidden="true"><i /></span>
        </button>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={resetExperience}
          disabled={isDefault}
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-canvas px-3 text-sm font-medium text-ink transition hover:bg-surface-raised disabled:cursor-default disabled:opacity-40"
        >
          <RotateCcw size={15} />
          Reset experience
        </button>
        <p className="mt-2 text-center text-[11px] leading-4 text-ink-faint">Light and dark mode are controlled separately.</p>
      </div>
    </div>
  );
}
