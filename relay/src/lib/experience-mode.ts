'use client';

export type RelayExperience = 'minimal' | 'relay' | 'aura' | 'scifi';
export type RelayPalette = 'monochrome' | 'lavender' | 'rose' | 'ocean' | 'sage' | 'sunset' | 'midnight';

export const EXPERIENCE_KEY = 'relay-experience-mode';
export const PALETTE_KEY = 'relay-experience-palette';
export const INTENSITY_KEY = 'relay-experience-intensity';
export const EXPERIENCE_EVENT = 'relay-experience-change';

export const DEFAULT_EXPERIENCE: RelayExperience = 'relay';
export const DEFAULT_PALETTE: RelayPalette = 'monochrome';
export const DEFAULT_INTENSITY = 55;

export const experiences: { id: RelayExperience; name: string; description: string }[] = [
  { id: 'minimal', name: 'Minimal', description: 'Flat, compact and quiet. Almost no decorative motion or glow.' },
  { id: 'relay', name: 'Relay', description: 'The original Relay look: balanced particles, motion and clean surfaces.' },
  { id: 'aura', name: 'Aura', description: 'Soft gradients, larger curves, translucent surfaces and calmer motion.' },
  { id: 'scifi', name: 'Nexus', description: 'Technical and luminous: angular panels, grid atmosphere and reactive glow.' },
];

export const palettes: { id: RelayPalette; name: string; swatches: string[] }[] = [
  { id: 'monochrome', name: 'Monochrome', swatches: ['#111111', '#f5f5f5'] },
  { id: 'lavender', name: 'Lavender', swatches: ['#8b5cf6', '#e9d5ff'] },
  { id: 'rose', name: 'Rose', swatches: ['#e11d48', '#fecdd3'] },
  { id: 'ocean', name: 'Ocean', swatches: ['#0284c7', '#bae6fd'] },
  { id: 'sage', name: 'Sage', swatches: ['#4d7c65', '#dce8df'] },
  { id: 'sunset', name: 'Sunset', swatches: ['#f97316', '#fbcfe8'] },
  { id: 'midnight', name: 'Midnight', swatches: ['#4338ca', '#111827'] },
];

export function readExperience() {
  if (typeof window === 'undefined') {
    return { experience: DEFAULT_EXPERIENCE, palette: DEFAULT_PALETTE, intensity: DEFAULT_INTENSITY };
  }
  const experience = (localStorage.getItem(EXPERIENCE_KEY) || DEFAULT_EXPERIENCE) as RelayExperience;
  const palette = (localStorage.getItem(PALETTE_KEY) || DEFAULT_PALETTE) as RelayPalette;
  const intensity = Math.max(0, Math.min(100, Number(localStorage.getItem(INTENSITY_KEY) || DEFAULT_INTENSITY)));
  return { experience, palette, intensity };
}

export function applyExperience(experience: RelayExperience, palette: RelayPalette, intensity: number) {
  const root = document.documentElement;
  root.dataset.relayExperience = experience;
  root.dataset.relayPalette = palette;
  root.style.setProperty('--relay-experience-intensity', String(Math.max(0, Math.min(100, intensity)) / 100));
}

export function saveExperience(experience: RelayExperience, palette: RelayPalette, intensity: number) {
  localStorage.setItem(EXPERIENCE_KEY, experience);
  localStorage.setItem(PALETTE_KEY, palette);
  localStorage.setItem(INTENSITY_KEY, String(intensity));
  applyExperience(experience, palette, intensity);
  window.dispatchEvent(new CustomEvent(EXPERIENCE_EVENT, { detail: { experience, palette, intensity } }));
}

export function resetExperience() {
  localStorage.removeItem(EXPERIENCE_KEY);
  localStorage.removeItem(PALETTE_KEY);
  localStorage.removeItem(INTENSITY_KEY);
  applyExperience(DEFAULT_EXPERIENCE, DEFAULT_PALETTE, DEFAULT_INTENSITY);
  window.dispatchEvent(new CustomEvent(EXPERIENCE_EVENT, {
    detail: { experience: DEFAULT_EXPERIENCE, palette: DEFAULT_PALETTE, intensity: DEFAULT_INTENSITY },
  }));
}
