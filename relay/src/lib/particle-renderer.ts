/** Rasterize the fine dust once, then composite three slowly orbiting layers.
 * This replaces thousands of per-frame trig calls and canvas state changes. */
export function createCloudRenderer(compact: boolean) {
  const size = compact ? 768 : 1024;
  const layers = Array.from({ length: 3 }, (_, layer) => {
    const texture = document.createElement('canvas');
    texture.width = size; texture.height = size;
    const ctx = texture.getContext('2d')!;
    const count = compact ? 1700 : 2800;
    let seed = 1741 + layer * 7151;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
    for (let i = 0; i < count; i++) {
      const radius = Math.pow(random(), 0.68) * size * 0.46;
      const angle = random() * Math.PI * 2 + radius / size * 5;
      const grain = (0.55 + random() * 0.8) * size / 900;
      ctx.globalAlpha = (0.25 + random() * 0.65) * (1 - radius / size * 1.2);
      ctx.fillStyle = '#fff';
      ctx.fillRect(size / 2 + Math.cos(angle) * radius, size / 2 + Math.sin(angle) * radius, grain, grain);
    }
    const light = document.createElement('canvas'); light.width = size; light.height = size;
    const lc = light.getContext('2d')!; lc.drawImage(texture, 0, 0);
    lc.globalCompositeOperation = 'source-in'; lc.fillStyle = '#171719'; lc.fillRect(0, 0, size, size);
    return { dark: texture, light };
  });
  return (ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, time: number, dark: boolean, mx = 0, my = 0) => {
    const spread = Math.min(width * 0.88, 940);
    for (let i = 0; i < layers.length; i++) {
      ctx.save();
      ctx.translate(cx + mx * (i + 1) * 2, cy + my * (i + 1) * 1.5);
      ctx.scale(1, 0.47 + i * 0.07);
      ctx.rotate(time * (i === 1 ? -0.025 : 0.018) + i * 1.3);
      ctx.globalAlpha = i === 0 ? 0.95 : 0.8;
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
