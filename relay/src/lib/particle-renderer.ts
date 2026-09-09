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
  scale?: number;
  alpha?: number;
};

type BlobPoint = {
  x: number;
  y: number;
  z: number;
  phase: number;
  grain: number;
  layer: 0 | 1 | 2 | 3 | 4;
  spark: number;
};

/** Layered point-sphere renderer. Three quiet, regular shells establish a
 * clean volume; a brighter turbulent skin supplies the organic silhouette. */
export function createCloudRenderer(compact: boolean, requested: ParticlePreferences = DEFAULT_PARTICLE_PREFERENCES) {
  const preferences = normalizeParticlePreferences(requested);
  const count = Math.round((compact ? 3800 : 6200) * preferences.density);
  const points: BlobPoint[] = [];
  let seed = 1741;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };

  const addShell = (amount: number, radius: number, layer: 1 | 2 | 3 | 4, turbulence: number) => {
    for (let i = 0; i < amount; i++) {
      const y = 1 - 2 * (i + 0.5) / amount;
      const ring = Math.sqrt(Math.max(0, 1 - y * y));
      const angle = i * GOLDEN_ANGLE + (random() - 0.5) * 0.055;
      const wave = 1
        + Math.sin(angle * 3 + y * 4.2) * turbulence
        + Math.sin(angle * 7 - y * 2.7) * turbulence * 0.52
        + (random() - 0.5) * turbulence * 0.8;
      const r = radius * wave;
      points.push({
        x: Math.cos(angle) * ring * r,
        y: y * r,
        z: Math.sin(angle) * ring * r,
        phase: random() * TAU,
        grain: layer === 4 ? 0.5 + random() * 0.76 : 0.42 + random() * 0.48,
        layer,
        spark: layer === 4 && random() > 0.978 ? 1 : 0,
      });
    }
  };

  // The inner shells stay deliberately orderly. Their overlap reads as one
  // dimensional core instead of a single hollow wireframe surface.
  addShell(Math.round(count * 0.16), 0.56, 1, 0.006);
  addShell(Math.round(count * 0.18), 0.72, 2, 0.009);
  addShell(Math.round(count * 0.2), 0.86, 3, 0.012);
  addShell(Math.round(count * 0.31), 1, 4, 0.06);

  const volumeCount = count - points.length;
  for (let i = 0; i < volumeCount; i++) {
    const y = random() * 2 - 1;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const angle = random() * TAU;
    const radius = Math.cbrt(random()) * 0.92;
    points.push({
      x: Math.cos(angle) * ring * radius,
      y: y * radius,
      z: Math.sin(angle) * ring * radius,
      phase: random() * TAU,
      grain: 0.4 + random() * 0.46,
      layer: 0,
      spark: random() > 0.994 ? 1 : 0,
    });
  }

  return (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, time: number, dark: boolean, motion: CloudMotion = {}) => {
    const mx = motion.mx ?? 0, my = motion.my ?? 0;
    const hover = motion.hover ?? 0, impulse = motion.impulse ?? 0;
    const pointerX = motion.pointerX ?? 0, pointerY = motion.pointerY ?? 0;
    const scale = Math.max(0.025, motion.scale ?? 1);
    const opacity = Math.max(0, Math.min(1, motion.alpha ?? 1));
    const viewportHeight = ctx.canvas.height / Math.max(1, ctx.getTransform().d);
    const radius = Math.min(width * (compact ? 0.31 : 0.225), viewportHeight * (compact ? 0.25 : 0.255), compact ? 205 : 286) * scale;
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
      const surfaceWobble = point.layer === 4
        ? 1 + Math.sin(time * 0.62 + point.phase) * 0.014 + impulse * (0.046 + point.spark * 0.034)
        : 1 + Math.sin(time * 0.24 + point.phase) * 0.0025 + impulse * 0.018;
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
      const alpha = point.layer === 4
        ? 0.18 + rim * 0.58 + front * 0.12 + point.spark * 0.18
        : point.layer === 3
          ? 0.075 + rim * 0.12 + front * 0.105
          : point.layer === 2
            ? 0.055 + rim * 0.085 + front * 0.085
            : point.layer === 1
              ? 0.04 + rim * 0.06 + front * 0.07
              : 0.035 + front * 0.095 + rim * 0.025 + point.spark * 0.24;
      const grain = Math.max(0.5, point.grain * preferences.size * (0.86 + rim * 0.34 + front * 0.14 + point.spark * 0.55));
      ctx.globalAlpha = Math.min(0.98, alpha) * opacity;
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
