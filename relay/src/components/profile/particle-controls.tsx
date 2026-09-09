'use client';

import {
  DEFAULT_PARTICLE_PREFERENCES,
  PARTICLE_LIMITS,
  readParticlePreferences,
  writeParticlePreferences,
  type ParticlePreferences,
} from '@/lib/particle-preferences';
import { RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ParticleControls() {
  const [preferences, setPreferences] = useState<ParticlePreferences>(DEFAULT_PARTICLE_PREFERENCES);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPreferences(readParticlePreferences()));
    return () => cancelAnimationFrame(frame);
  }, []);

  function update<Field extends keyof ParticlePreferences>(field: Field, value: ParticlePreferences[Field]) {
    const next = { ...preferences, [field]: value };
    setPreferences(next);
    writeParticlePreferences(next);
  }

  function reset() {
    setPreferences(DEFAULT_PARTICLE_PREFERENCES);
    writeParticlePreferences(DEFAULT_PARTICLE_PREFERENCES);
  }

  return (
    <div className="w-full rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-ink">Particle system</h3>
          <p className="mt-1 text-xs leading-5 text-ink-faint">Tune the landing cloud, startup, and page transitions on this device.</p>
        </div>
        <button type="button" onClick={reset} aria-label="Reset particle settings" title="Reset particle settings" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink">
          <RotateCcw size={15} />
        </button>
      </div>

      <ParticleSlider
        label="Particle amount"
        value={preferences.density}
        min={PARTICLE_LIMITS.density.min}
        max={PARTICLE_LIMITS.density.max}
        step={PARTICLE_LIMITS.density.step}
        onChange={(value) => update('density', value)}
      />
      <ParticleSlider
        label="Dot size"
        value={preferences.size}
        min={PARTICLE_LIMITS.size.min}
        max={PARTICLE_LIMITS.size.max}
        step={PARTICLE_LIMITS.size.step}
        onChange={(value) => update('size', value)}
      />
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4">
        <div>
          <p className="text-xs font-medium text-ink">Minimal loading</p>
          <p className="mt-1 text-xs leading-5 text-ink-faint">Use a quiet Relay mark instead of the particle loading scene.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={preferences.minimalLoading}
          onClick={() => update('minimalLoading', !preferences.minimalLoading)}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${preferences.minimalLoading ? 'border-ink bg-ink' : 'border-border bg-canvas'}`}
        >
          <span className={`absolute top-1 h-[18px] w-[18px] rounded-full transition-transform ${preferences.minimalLoading ? 'translate-x-[25px] bg-canvas' : 'translate-x-1 bg-ink-muted'}`} />
          <span className="sr-only">Minimal loading</span>
        </button>
      </div>
    </div>
  );
}

function ParticleSlider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <label className="mt-5 block">
      <span className="flex items-center justify-between gap-4 text-xs font-medium text-ink-muted">
        <span>{label}</span>
        <span className="tabular-nums text-ink">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="beta-particle-slider mt-3 w-full"
        style={{ '--particle-fill': `${fill}%` } as React.CSSProperties}
      />
      <span className="mt-1.5 flex justify-between text-[11px] text-ink-faint"><span>Subtle</span><span>Maximum</span></span>
    </label>
  );
}
