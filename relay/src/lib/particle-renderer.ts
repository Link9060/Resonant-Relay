import { DEFAULT_PARTICLE_PREFERENCES, normalizeParticlePreferences, type ParticlePreferences } from '@/lib/particle-preferences';

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

export type CloudMotion = {
  mx?: number;
  my?: number;
  hover?: number;
  impulse?: number;
  loading?: boolean;
  pointerX?: number;
  pointerY?: number;
};

type BlobPoint = {
  x: number;
  y: number;
  z: number;
  phase: number;
  grain: number;
  shell: number;
  spark: number;
};

/** A true 3D point blob: most particles sit on a noisy spherical shell while
 * the rest create darker interior depth. Mouse input rotates and locally
 * displaces the projected points without introducing a WebGL dependency. */
export function createCloudRenderer(compact: boolean, requested: ParticlePreferences = DEFAULT_PARTICLE_PREFERENCES) {
  const preferences = normalizeParticlePreferences(requested);
  // Keep the object physically compact while raising point density. The
  // desktop default lands just above ten thousand points without increasing
  // the number of animation frames we draw.
  const count = Math.round((compact ? 3200 : 5600) * preferences.density);
  const shellCount = Math.round(count * 0.64);
  const points: BlobPoint[] = [];
  let seed = 1741;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };

  // A Fibonacci shell avoids obvious clumps while overlapping waves keep its
  // silhouette organic instead of mathematically round.
  for (let i = 0; i < shellCount; i++) {
    const y = 1 - 2 * (i + 0.5) / shellCount;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = i * GOLDEN_ANGLE + (random() - 0.5) * 0.07;
    const deformation = 1
      + Math.sin(angle * 3 + y * 4.2) * 0.055
      + Math.sin(angle * 7 - y * 2.7) * 0.032
      + (random() - 0.5) * 0.045;
    points.push({
      x: Math.cos(angle) * ring * deformation,
      y: y * deformation,
      z: Math.sin(angle) * ring * deformation,
      phase: random() * TAU,
      grain: 0.52 + random() * 0.7,
      shell: 1,
      spark: random() > 0.982 ? 1 : 0,
    });
  }

  // Volumetric points make the center feel dimensional and partially hollow,
  // matching the reference's quieter interior and brighter turbulent edge.
  for (let i = shellCount; i < count; i++) {
    const y = random() * 2 - 1;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = random() * TAU;
    const radius = Math.cbrt(random()) * 0.91;
    points.push({
      x: Math.cos(angle) * ring * radius,
      y: y * radius,
      z: Math.sin(angle) * ring * radius,
      phase: random() * TAU,
      grain: 0.46 + random() * 0.62,
      shell: 0,
      spark: random() > 0.994 ? 1 : 0,
    });
  }

  return (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, time: number, dark: boolean, motion: CloudMotion = {}) => {
    const mx = motion.mx ?? 0, my = motion.my ?? 0;
    const hover = motion.hover ?? 0, impulse = motion.impulse ?? 0;
    const pointerX = motion.pointerX ?? 0, pointerY = motion.pointerY ?? 0;
    const viewportHeight = ctx.canvas.height / Math.max(1, ctx.getTransform().d);
    const radius = Math.min(width * (compact ? 0.34 : 0.245), viewportHeight * (compact ? 0.27 : 0.28), compact ? 220 : 315);
    const yaw = time * (motion.loading ? 0.42 : 0.055) + mx * hover * 0.58;
    const pitch = Math.sin(time * 0.17) * 0.035 - my * hover * 0.32;
    const roll = Math.sin(time * 0.11) * 0.025 + mx * hover * 0.06;
    const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
    const cpitch = Math.cos(pitch), spitch = Math.sin(pitch);
    const croll = Math.cos(roll), sroll = Math.sin(roll);
    const followX = mx * hover * radius * 0.025;
    const followY = my * hover * radius * 0.018;
    const interactionRadius = radius * 0.4;
    ctx.fillStyle = dark ? '#fff' : '#0f0f11';

    for (const point of points) {
      const surfaceWobble = point.shell
        ? 1 + Math.sin(time * 0.68 + point.phase) * 0.012 + impulse * (0.045 + point.spark * 0.035)
        : 1 + impulse * 0.018;
      const px = point.x * surfaceWobble;
      const py = point.y * surfaceWobble;
      const pz = point.z * surfaceWobble;

      const x1 = px * cyaw + pz * syaw;
      const z1 = -px * syaw + pz * cyaw;
      const y2 = py * cpitch - z1 * spitch;
      const z2 = py * spitch + z1 * cpitch;
      const x3 = x1 * croll - y2 * sroll;
      const y3 = x1 * sroll + y2 * croll;
      const perspective = 1 / Math.max(0.74, 1 - z2 * 0.14);
      let sx = cx + followX + x3 * radius * perspective;
      let sy = cy + followY + y3 * radius * perspective;

      // Particles beneath the pointer peel away locally while the rest keeps
      // rotating, making the interaction visible without expensive physics.
      if (hover > 0.015) {
        const dx = sx - (cx + pointerX);
        const dy = sy - (cy + pointerY);
        const distance = Math.hypot(dx, dy);
        if (distance < interactionRadius) {
          const force = Math.pow(1 - distance / interactionRadius, 2) * hover;
          const inverse = distance > 0.5 ? 1 / distance : 0;
          sx += dx * inverse * force * radius * 0.095;
          sy += dy * inverse * force * radius * 0.095;
        }
      }

      const projectedRadius = Math.min(1.15, Math.hypot(x3, y3));
      const rim = Math.max(0, Math.min(1, (projectedRadius - 0.67) / 0.35));
      const front = Math.max(0, Math.min(1, (z2 + 1.05) / 2.1));
      const alpha = point.shell
        ? 0.14 + rim * 0.54 + front * 0.12 + point.spark * 0.18
        : 0.065 + front * 0.18 + rim * 0.08 + point.spark * 0.3;
      const grain = Math.max(0.55, point.grain * preferences.size * (0.82 + rim * 0.42 + front * 0.16 + point.spark * 0.58));
      ctx.globalAlpha = Math.min(0.98, alpha);
      ctx.fillRect(sx - grain / 2, sy - grain / 2, grain, grain);
    }
    ctx.globalAlpha = 1;
  };
}

export function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Bound fullscreen buffers on Retina and ultrawide displays.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(5_000_000 / Math.max(1, width * height)));
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
