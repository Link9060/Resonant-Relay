// Shared timing and events keep the intro, workspace and theme in one sequence.
export const BETA_INTRO_KEY = 'relay-beta-particle-intro-v1';
export const INTRO_DONE = 'relay:intro-done';
export const PARTICLE_EVENT = 'relay:particles';
export type ParticleCue = { kind: 'open' | 'close' | 'theme'; dark?: boolean };
export function emitParticles(cue: ParticleCue) {
  window.dispatchEvent(new CustomEvent(PARTICLE_EVENT, { detail: cue }));
}
export function introSeen() {
  try { return sessionStorage.getItem(BETA_INTRO_KEY) === '1'; } catch { return false; }
}
export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export type Dust = { angle: number; radius: number; depth: number; size: number; phase: number };
export function makeDust(count: number): Dust[] {
  return Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2, radius: Math.sqrt(Math.random()),
    depth: Math.random(), size: 0.25 + Math.random() * 0.65, phase: Math.random() * Math.PI * 2,
  }));
}
