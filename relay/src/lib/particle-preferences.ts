export const PARTICLE_PREFERENCES_KEY = 'relay-beta-particle-preferences-v1';
export const PARTICLE_PREFERENCES_EVENT = 'relay:particle-preferences';

export type ParticlePreferences = {
  density: number;
  size: number;
  minimalLoading: boolean;
};

export const PARTICLE_LIMITS = {
  density: { min: 0.25, max: 4, step: 0.05 },
  size: { min: 0.6, max: 2.8, step: 0.05 },
} as const;

// The Beta should feel dense by default while still leaving room to scale up.
export const DEFAULT_PARTICLE_PREFERENCES: ParticlePreferences = {
  density: 1.85,
  size: 1.35,
  minimalLoading: false,
};

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

export function normalizeParticlePreferences(value?: Partial<ParticlePreferences> | null): ParticlePreferences {
  return {
    density: clamp(value?.density, PARTICLE_LIMITS.density.min, PARTICLE_LIMITS.density.max, DEFAULT_PARTICLE_PREFERENCES.density),
    size: clamp(value?.size, PARTICLE_LIMITS.size.min, PARTICLE_LIMITS.size.max, DEFAULT_PARTICLE_PREFERENCES.size),
    minimalLoading: typeof value?.minimalLoading === 'boolean' ? value.minimalLoading : DEFAULT_PARTICLE_PREFERENCES.minimalLoading,
  };
}

export function readParticlePreferences(): ParticlePreferences {
  try {
    return normalizeParticlePreferences(JSON.parse(localStorage.getItem(PARTICLE_PREFERENCES_KEY) ?? 'null'));
  } catch {
    return DEFAULT_PARTICLE_PREFERENCES;
  }
}

export function writeParticlePreferences(value: ParticlePreferences) {
  const next = normalizeParticlePreferences(value);
  try { localStorage.setItem(PARTICLE_PREFERENCES_KEY, JSON.stringify(next)); } catch { /* Keep the live preference even when storage is unavailable. */ }
  window.dispatchEvent(new CustomEvent<ParticlePreferences>(PARTICLE_PREFERENCES_EVENT, { detail: next }));
}
