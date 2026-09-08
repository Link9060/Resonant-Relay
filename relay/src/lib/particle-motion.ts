// Shared timing and events keep the intro, workspace and theme in one sequence.
export const BETA_INTRO_KEY = 'relay-beta-particle-intro-v1';
export const INTRO_DONE = 'relay:intro-done';
export const PARTICLE_EVENT = 'relay:particles';
export type ParticleCue = { kind: 'open' | 'close' | 'theme'; dark?: boolean };
export const PAGE_MOTION_MS = 650;
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
export function drawCloud(ctx: CanvasRenderingContext2D, dust: Dust[], w: number, h: number, t: number, dark: boolean, mx = 0, my = 0) {
  const spread = Math.min(w * 0.38, 360);
  for (const p of dust) {
    const a = p.angle + t * (0.035 + p.depth * 0.025);
    const r = p.radius * spread * (0.9 + Math.sin(t * 0.3 + p.phase) * 0.08);
    const x = w / 2 + Math.cos(a) * r + mx * p.depth * 8;
    const y = h / 2 + Math.sin(a) * r * 0.34 + Math.sin(a * 3 + t * 0.22 + p.phase) * 22 * p.radius + my * p.depth * 6;
    ctx.fillStyle = dark ? (p.depth > 0.15 ? '#fff' : '#555') : (p.depth > 0.15 ? '#111' : '#aaa');
    ctx.globalAlpha = (0.16 + p.depth * 0.55) * (0.65 + Math.sin(p.phase + t * 0.5) * 0.25);
    ctx.fillRect(x, y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}
