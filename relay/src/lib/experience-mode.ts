'use client';

export type RelayExperience = 'flow' | 'still' | 'nexus' | 'aura' | 'slate' | 'spark' | 'lucid';
export type RelayPalette = 'monochrome' | 'cobalt' | 'violet' | 'rose' | 'cyan' | 'emerald' | 'amber';

export const EXPERIENCE_KEY = 'relay-experience-mode';
export const PALETTE_KEY = 'relay-experience-palette';
export const INTENSITY_KEY = 'relay-experience-intensity';
export const LOCK_IN_KEY = 'relay-experience-lock-in';
export const EXPERIENCE_EVENT = 'relay-experience-change';

export const DEFAULT_EXPERIENCE: RelayExperience = 'flow';
export const DEFAULT_PALETTE: RelayPalette = 'monochrome';
export const DEFAULT_INTENSITY = 55;
export const DEFAULT_LOCK_IN = false;

export const experiences: {
  id: RelayExperience;
  name: string;
  description: string;
  signature: string;
}[] = [
  { id: 'flow', name: 'Flow', description: 'Balanced motion, particles and familiar Relay surfaces.', signature: 'Balanced' },
  { id: 'still', name: 'Still', description: 'Flat, fast and distraction-free with no decorative particles.', signature: 'Focused' },
  { id: 'nexus', name: 'Nexus', description: 'A reactive network with angular panels and signal-like motion.', signature: 'Cinematic' },
  { id: 'aura', name: 'Aura', description: 'Soft geometry, gentle movement and a calm, welcoming rhythm.', signature: 'Calm' },
  { id: 'slate', name: 'Slate', description: 'Editorial structure, strong typography and orderly sections.', signature: 'Organized' },
  { id: 'spark', name: 'Spark', description: 'Responsive, energetic interactions with expressive micro-motion.', signature: 'Playful' },
  { id: 'lucid', name: 'Lucid', description: 'Layered translucent surfaces with blur, depth and reflection.', signature: 'Dimensional' },
];

export const palettes: { id: RelayPalette; name: string; light: string; dark: string }[] = [
  { id: 'monochrome', name: 'Monochrome', light: '#111111', dark: '#f4f4f5' },
  { id: 'cobalt', name: 'Cobalt', light: '#2563eb', dark: '#60a5fa' },
  { id: 'violet', name: 'Violet', light: '#7c3aed', dark: '#a78bfa' },
  { id: 'rose', name: 'Rose', light: '#e11d48', dark: '#fb7185' },
  { id: 'cyan', name: 'Cyan', light: '#0891b2', dark: '#22d3ee' },
  { id: 'emerald', name: 'Emerald', light: '#059669', dark: '#34d399' },
  { id: 'amber', name: 'Amber', light: '#d97706', dark: '#fbbf24' },
];

const experienceIds = new Set<RelayExperience>(experiences.map(({ id }) => id));
const paletteIds = new Set<RelayPalette>(palettes.map(({ id }) => id));

export function normalizeExperience(value: string | null): RelayExperience {
  if (value === 'relay') return 'flow';
  if (value === 'minimal') return 'still';
  if (value === 'scifi') return 'nexus';
  return experienceIds.has(value as RelayExperience) ? value as RelayExperience : DEFAULT_EXPERIENCE;
}

export function normalizePalette(value: string | null): RelayPalette {
  const legacy: Record<string, RelayPalette> = {
    lavender: 'violet', ocean: 'cyan', sage: 'emerald', sunset: 'amber', midnight: 'cobalt',
  };
  if (value && legacy[value]) return legacy[value]!;
  return paletteIds.has(value as RelayPalette) ? value as RelayPalette : DEFAULT_PALETTE;
}

export function readExperience() {
  if (typeof window === 'undefined') {
    return { experience: DEFAULT_EXPERIENCE, palette: DEFAULT_PALETTE, intensity: DEFAULT_INTENSITY, lockIn: DEFAULT_LOCK_IN };
  }
  const experience = normalizeExperience(localStorage.getItem(EXPERIENCE_KEY));
  const palette = normalizePalette(localStorage.getItem(PALETTE_KEY));
  const intensity = Math.max(0, Math.min(100, Number(localStorage.getItem(INTENSITY_KEY) || DEFAULT_INTENSITY)));
  const lockIn = localStorage.getItem(LOCK_IN_KEY) === 'true';
  return { experience, palette, intensity, lockIn };
}

export function applyExperience(experience: RelayExperience, palette: RelayPalette, intensity: number, lockIn = false) {
  const root = document.documentElement;
  root.dataset.relayExperience = experience;
  root.dataset.relayPalette = palette;
  root.dataset.relayLockIn = String(lockIn);
  root.style.setProperty('--relay-experience-intensity', String(Math.max(0, Math.min(100, intensity)) / 100));
}

export function saveExperience(experience: RelayExperience, palette: RelayPalette, intensity: number) {
  const lockIn = localStorage.getItem(LOCK_IN_KEY) === 'true';
  localStorage.setItem(EXPERIENCE_KEY, experience);
  localStorage.setItem(PALETTE_KEY, palette);
  localStorage.setItem(INTENSITY_KEY, String(intensity));
  applyExperience(experience, palette, intensity, lockIn);
  window.dispatchEvent(new CustomEvent(EXPERIENCE_EVENT, { detail: { experience, palette, intensity, lockIn } }));
}

export function saveLockIn(lockIn: boolean) {
  const current = readExperience();
  localStorage.setItem(LOCK_IN_KEY, String(lockIn));
  applyExperience(current.experience, current.palette, current.intensity, lockIn);
  window.dispatchEvent(new CustomEvent(EXPERIENCE_EVENT, { detail: { ...current, lockIn } }));
}

export function resetExperience() {
  localStorage.removeItem(EXPERIENCE_KEY);
  localStorage.removeItem(PALETTE_KEY);
  localStorage.removeItem(INTENSITY_KEY);
  localStorage.removeItem(LOCK_IN_KEY);
  applyExperience(DEFAULT_EXPERIENCE, DEFAULT_PALETTE, DEFAULT_INTENSITY, DEFAULT_LOCK_IN);
  window.dispatchEvent(new CustomEvent(EXPERIENCE_EVENT, {
    detail: { experience: DEFAULT_EXPERIENCE, palette: DEFAULT_PALETTE, intensity: DEFAULT_INTENSITY, lockIn: DEFAULT_LOCK_IN },
  }));
}
