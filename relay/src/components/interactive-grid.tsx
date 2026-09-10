'use client';

import { useEffect, useRef } from 'react';
import { fitCanvas } from '@/lib/particle-renderer';

export function InteractiveGrid() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!, parent = canvas.parentElement!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, w = 0, h = 0, columns = 0, rows = 0;
    let mx = 0, my = 0, x = 0, y = 0, strength = 0, targetStrength = 0, visible = true;
    let color = getComputedStyle(parent).color;
    let xs = new Float32Array(), ys = new Float32Array(), alphas = new Float32Array();
    const wake = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw); };
    const resize = () => {
      w = parent.clientWidth; h = parent.clientHeight;
      fitCanvas(canvas, ctx, w, h);
      columns = Math.ceil(w / 28) + 2; rows = Math.ceil(h / 28) + 2;
      xs = new Float32Array(columns * rows); ys = new Float32Array(columns * rows); alphas = new Float32Array(columns * rows);
      wake();
    };
    const pointer = (e: PointerEvent) => {
      if (media.matches) return;
      const rect = parent.getBoundingClientRect(); mx = e.clientX - rect.left; my = e.clientY - rect.top;
      if (!strength) { x = mx; y = my; }
      targetStrength = 1; wake();
    };
    const leave = () => { targetStrength = 0; wake(); };
    const draw = () => {
      frame = 0;
      if (!visible || document.hidden) return;
      x += (mx - x) * 0.2; y += (my - y) * 0.2;
      strength += (targetStrength - strength) * 0.16;
      if (Math.abs(targetStrength - strength) < 0.002) strength = targetStrength;
      ctx.clearRect(0, 0, w, h); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 0.65;
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
        const i = row * columns + col, px = col * 28, py = row * 28;
        const dx = px - x, dy = py - y;
        const force = media.matches ? 0 : Math.max(0, 1 - Math.hypot(dx, dy) / 170) * strength;
        xs[i] = px + dx * force * 0.1; ys[i] = py + dy * force * 0.1; alphas[i] = 0.055 + force * 0.22;
      }
      for (let row = 0; row < rows - 1; row++) for (let col = 0; col < columns - 1; col++) {
        const i = row * columns + col;
        ctx.globalAlpha = alphas[i]!;
        ctx.beginPath(); ctx.moveTo(xs[i + 1]!, ys[i + 1]!); ctx.lineTo(xs[i]!, ys[i]!); ctx.lineTo(xs[i + columns]!, ys[i + columns]!); ctx.stroke();
        if (alphas[i]! > 0.14) ctx.fillRect(xs[i]! - 0.8, ys[i]! - 0.8, 1.6, 1.6);
      }
      ctx.globalAlpha = 1;
      // Once the mouse and falloff settle, the canvas stays still at zero frame cost.
      if (!media.matches && (Math.abs(mx - x) > 0.1 || Math.abs(my - y) > 0.1 || strength !== targetStrength)) wake();
    };
    const theme = new MutationObserver(() => { color = getComputedStyle(parent).color; wake(); });
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const size = new ResizeObserver(resize); size.observe(parent);
    const intersection = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? true; wake(); }); intersection.observe(parent);
    const visibility = () => { cancelAnimationFrame(frame); frame = 0; wake(); };
    resize(); parent.addEventListener('pointermove', pointer, { passive: true }); parent.addEventListener('pointerleave', leave);
    document.addEventListener('visibilitychange', visibility); media.addEventListener('change', wake);
    return () => {
      cancelAnimationFrame(frame); size.disconnect(); intersection.disconnect(); theme.disconnect();
      parent.removeEventListener('pointermove', pointer); parent.removeEventListener('pointerleave', leave);
      document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', wake);
    };
  }, []);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
