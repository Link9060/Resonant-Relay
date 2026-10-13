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
  resetExperience,
  saveExperience,
  saveLockIn,
  type RelayExperience,
  type RelayPalette,
} from '@/lib/experience-mode';
import { IS_BETA } from '@/lib/config';
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
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink">Relay Experience</h3>
          <p className="mt-1 text-xs leading-5 text-ink-faint">Choose an experience and adjust its motion. Shared colors and theme are in ARROW appearance.</p>
        </div>
        {IS_BETA && <span className="shrink-0 rounded-full border border-border px-2 py-1 text-xs font-semibold uppercase tracking-[.12em] text-ink-muted">Beta</span>}
      </div>

      <label className="mt-4 block text-sm text-ink-muted">
        Experience
        <select aria-label="Relay experience" className="profile-input mt-2" value={experience} onChange={(event) => update(event.target.value as RelayExperience)}>
          {experiences.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
        </select>
      </label>
      {IS_BETA && <button type="button" className="account-action mt-3" onClick={(event) => {
        const arrow = (window as Window & { ArrowOS?: { openPanel: (name: string, module: string, anchor: HTMLElement) => void } }).ArrowOS;
        arrow?.openPanel('appearance', 'relay', event.currentTarget);
      }}>ARROW appearance</button>}

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
          className="relay-lock-in-toggle flex w-full min-w-0 items-center gap-3 rounded-xl border border-border bg-canvas p-3 text-left"
        >
          <span className="relay-lock-in-icon grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-ink-muted"><Crosshair size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Lock-In</span>
            <span className="mt-0.5 block text-xs leading-4 text-ink-faint">Hide nonessential motion and attention signals while you focus.</span>
          </span>
          <span className="relay-lock-in-switch shrink-0" aria-hidden="true"><i /></span>
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

