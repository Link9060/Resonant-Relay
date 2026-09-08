'use client';

import { useEffect, useRef } from 'react';
import { reducedMotion } from '@/lib/particle-motion';

export function InteractiveGrid() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!, parent = canvas.parentElement!;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0, w = 0, h = 0, mx = -1000, my = -1000, x = -1000, y = -1000;
    const resize = () => { w = parent.clientWidth; h = parent.clientHeight; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const observer = new ResizeObserver(resize); observer.observe(parent); resize();
    const pointer = (e: PointerEvent) => { const r = parent.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; if (x === -1000) { x = mx; y = my; } };
    const leave = () => { mx = -1000; my = -1000; };
    const draw = () => {
      const reduce = reducedMotion();
      x += (mx - x) * 0.12; y += (my - y) * 0.12;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = getComputedStyle(parent).color; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 0.65;
      const point = (px: number, py: number) => {
        const dx = px - x, dy = py - y, distance = Math.hypot(dx, dy);
        const force = reduce ? 0 : Math.max(0, 1 - distance / 170);
        return { x: px + dx * force * 0.12, y: py + dy * force * 0.12, alpha: 0.055 + force * 0.27 };
      };
      for (let gy = 0; gy <= h + 28; gy += 28) for (let gx = 0; gx <= w + 28; gx += 28) {
        const p = point(gx, gy), right = point(gx + 28, gy), down = point(gx, gy + 28);
        ctx.globalAlpha = p.alpha; ctx.beginPath(); ctx.moveTo(right.x, right.y); ctx.lineTo(p.x, p.y); ctx.lineTo(down.x, down.y); ctx.stroke();
        if (p.alpha > 0.12) ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
      }
      ctx.globalAlpha = 1; frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw); parent.addEventListener('pointermove', pointer); parent.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); parent.removeEventListener('pointermove', pointer); parent.removeEventListener('pointerleave', leave); };
  }, []);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}
