import { DEFAULT_PARTICLE_PREFERENCES, normalizeParticlePreferences, type ParticlePreferences } from '@/lib/particle-preferences';

export type CloudMotion = {
  mx?: number;
  my?: number;
  hover?: number;
  impulse?: number;
  loading?: boolean;
};

/** Rasterize the fine dust and smoke once, then composite four orbiting layers.
 * Density changes cost texture-generation time, not per-frame particle math. */
export function createCloudRenderer(compact: boolean, requested: ParticlePreferences = DEFAULT_PARTICLE_PREFERENCES) {
  const preferences = normalizeParticlePreferences(requested);
  const size = compact ? 768 : 1024;
  const layers = Array.from({ length: 4 }, (_, layer) => {
    const texture = document.createElement('canvas');
    texture.width = size; texture.height = size;
    const ctx = texture.getContext('2d')!;
    const count = Math.round((compact ? 1450 : 2350) * preferences.density);
    let seed = 1741 + layer * 7151;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };

    // Wide, low-opacity billows give the point field a smoke-like body while
    // preserving the visible individual grains that define Relay's motion.
    for (let i = 0; i < 34; i++) {
      const radius = (0.05 + random() * 0.19) * size;
      const x = size / 2 + (random() - 0.5) * size * 0.58;
      const y = size / 2 + (random() - 0.5) * size * 0.28;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(255,255,255,${0.022 + random() * 0.026})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    for (let i = 0; i < count; i++) {
      const radius = Math.pow(random(), 0.76) * size * 0.47;
      const angle = random() * Math.PI * 2 + radius / size * 5;
      const grain = (0.78 + random() * 1.12) * preferences.size * size / 900;
      ctx.globalAlpha = (0.28 + random() * 0.7) * Math.max(0.08, 1 - radius / size * 1.14);
      ctx.fillStyle = '#fff';
      const x = size / 2 + Math.cos(angle) * radius;
      const y = size / 2 + Math.sin(angle) * radius;
      if (grain > 1.45) { ctx.beginPath(); ctx.arc(x, y, grain * 0.5, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(x, y, grain, grain);
    }
    ctx.globalAlpha = 1;
    const light = document.createElement('canvas'); light.width = size; light.height = size;
    const lc = light.getContext('2d')!; lc.drawImage(texture, 0, 0);
    lc.globalCompositeOperation = 'source-in'; lc.fillStyle = '#171719'; lc.fillRect(0, 0, size, size);
    return { dark: texture, light };
  });
  return (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, time: number, dark: boolean, motion: CloudMotion = {}) => {
    const spread = Math.min(width * 0.94, 1040);
    const mx = motion.mx ?? 0, my = motion.my ?? 0;
    const hover = motion.hover ?? 0, impulse = motion.impulse ?? 0;
    for (let i = 0; i < layers.length; i++) {
      ctx.save();
      const depth = (i + 1) / layers.length;
      const push = hover * (8 + depth * 13);
      ctx.translate(cx + mx * push, cy + my * push * 0.62);
      const pulse = 1 + impulse * (0.035 + depth * 0.07);
      ctx.scale(pulse, pulse * (0.43 + i * 0.045));
      const direction = i % 2 ? -1 : 1;
      const speed = motion.loading ? 0.29 + i * 0.025 : 0.018 + i * 0.004;
      ctx.rotate(time * speed * direction + i * 1.22 + mx * hover * direction * 0.035);
      ctx.globalAlpha = i === 0 ? 0.98 : 0.78;
      const texture = dark ? layers[i]!.dark : layers[i]!.light;
      ctx.drawImage(texture, -spread / 2, -spread / 2, spread, spread);
      ctx.restore();
    }
  };
}

export function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, width: number, height: number) {
  // Bound fullscreen buffers on Retina and ultrawide displays.
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(5_000_000 / Math.max(1, width * height)));
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
