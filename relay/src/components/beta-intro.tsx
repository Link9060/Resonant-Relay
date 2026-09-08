'use client';

import { useEffect, useRef, useState } from 'react';
import { BASE_PATH } from '@/lib/config';
import { BETA_INTRO_KEY, INTRO_DONE, drawCloud, introSeen, makeDust, reducedMotion } from '@/lib/particle-motion';

// Formation 0–2.05s; hold exactly 3s; dissolve, pulse, burst, warp;
// black 9.6–10.6s; edge-to-center tile reveal 10.6–12.5s.
export function BetaIntro() {
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const skipRef = useRef<HTMLButtonElement>(null);

  function finish() {
    try { sessionStorage.setItem(BETA_INTRO_KEY, '1'); } catch { /* Storage is optional. */ }
    audioRef.current?.pause();
    setVisible(false);
    window.dispatchEvent(new Event(INTRO_DONE));
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(!introSeen()));
    return () => { cancelAnimationFrame(id); audioRef.current?.pause(); };
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    skipRef.current?.focus();
    return () => { document.body.style.overflow = previousOverflow; };
  }, [visible]);

  useEffect(() => {
    if (!active || !visible || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) { finish(); return; }
    let frame = 0, elapsed = 0, previous = 0;
    let w = 0, h = 0;
    const dust = makeDust(window.innerWidth < 600 ? 1700 : 3200);
    const raster = document.createElement('canvas');
    const rc = raster.getContext('2d', { willReadFrequently: true })!;
    let points: { x: number; y: number; delay: number; angle: number; r: number }[] = [];
    const logo = new Image();
    let logoReady = false;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      raster.width = w; raster.height = h;
      rc.font = `600 ${Math.min(96, w * 0.19)}px system-ui`;
      rc.textAlign = 'center'; rc.textBaseline = 'middle'; rc.fillStyle = '#fff';
      const size = Math.min(96, w * 0.19);
      const textWidth = rc.measureText('Relay').width;
      const iconSize = size * 0.92, gap = size * 0.22;
      rc.fillText('Relay', w / 2 + (iconSize + gap) / 2, h / 2);
      if (logoReady) {
        const icon = document.createElement('canvas'); icon.width = 256; icon.height = 256;
        const ic = icon.getContext('2d')!;
        ic.drawImage(logo, 0, 0, 256, 256); ic.globalCompositeOperation = 'source-in';
        ic.fillStyle = '#fff'; ic.fillRect(0, 0, 256, 256);
        rc.drawImage(icon, w / 2 - (textWidth + iconSize + gap) / 2, h / 2 - iconSize / 2, iconSize, iconSize);
      }
      const pixels = rc.getImageData(0, 0, w, h).data;
      points = [];
      for (let y = Math.floor(h / 2 - 70); y < Math.min(h, h / 2 + 70); y += 3) {
        for (let x = 0; x < w; x += 3) {
          if ((pixels[(y * w + x) * 4 + 3] ?? 0) > 100) points.push({ x, y, delay: Math.random(), angle: Math.random() * Math.PI * 2, r: 40 + Math.random() * 230 });
        }
      }
    };
    resize();
    logo.onload = () => { logoReady = true; resize(); };
    logo.src = `${BASE_PATH}/relay-icon.svg`;
    const draw = (now: number) => {
      // Freeze the cinematic clock in a background tab instead of skipping scenes.
      if (previous && !document.hidden) elapsed += Math.min(now - previous, 50);
      previous = now;
      ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      const t = elapsed;
      if (t < 5050) {
        const solid = Math.max(0, Math.min(1, (t - 1780) / 270));
        for (const p of points) {
          const v = Math.max(0, Math.min(1, (t - 260 - p.delay * 150) / 1300));
          const ease = 1 - Math.pow(1 - v, 3);
          const burst = Math.min(1, t / 400);
          const bx = w / 2 + Math.cos(p.angle) * p.r * burst;
          const by = h / 2 + Math.sin(p.angle) * p.r * burst;
          ctx.globalAlpha = (1 - solid) * Math.min(1, t / 120);
          ctx.fillStyle = '#fff'; ctx.fillRect(bx + (p.x - bx) * ease, by + (p.y - by) * ease, 1.3, 1.3);
        }
        ctx.globalAlpha = solid; ctx.drawImage(raster, 0, 0);
      } else if (t < 7400) {
        // Random cells lift out of the exact word raster, becoming individual dots.
        const dissolve = Math.min(1, (t - 5050) / 1250);
        const pulse = t >= 6400 && t < 7000 ? Math.sin((t - 6400) / 600 * Math.PI) : 0;
        const explode = Math.max(0, (t - 7000) / 400);
        if (dissolve < 1) {
          ctx.globalAlpha = 1; ctx.drawImage(raster, 0, 0);
          ctx.fillStyle = '#000';
          for (const p of points) if (p.delay < dissolve) ctx.fillRect(p.x - 1, p.y - 1, 5, 5);
        }
        ctx.fillStyle = '#fff';
        for (const p of points) {
          if (p.delay > dissolve) continue;
          const drift = Math.max(0, dissolve - p.delay) * 15;
          const scale = 1 + pulse * 0.13 + explode * explode * 18;
          ctx.globalAlpha = 0.65 + pulse * 0.35;
          const x = w / 2 + (p.x - w / 2 + Math.cos(p.angle) * drift) * scale;
          const y = h / 2 + (p.y - h / 2 + Math.sin(p.angle) * drift) * scale;
          ctx.beginPath(); ctx.arc(x, y, 0.8 + pulse * 0.8, 0, Math.PI * 2); ctx.fill();
        }
      } else if (t < 9600) {
        const warp = (t - 7400) / 2200;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.65;
        for (const p of dust) {
          const z = (p.depth + warp * 2.8) % 1;
          const radius = 7 + z * z * Math.max(w, h);
          const length = (8 + z * z * 180) * Math.min(1, warp * 5);
          ctx.globalAlpha = z * 0.75 * Math.min(1, (1 - warp) * 7);
          ctx.beginPath();
          ctx.moveTo(w / 2 + Math.cos(p.angle) * radius, h / 2 + Math.sin(p.angle) * radius);
          ctx.lineTo(w / 2 + Math.cos(p.angle) * (radius + length), h / 2 + Math.sin(p.angle) * (radius + length)); ctx.stroke();
        }
      } else if (t >= 10600) {
        ctx.globalAlpha = 1;
        const dark = document.documentElement.classList.contains('dark');
        ctx.fillStyle = dark ? '#0a0a0b' : '#fff'; ctx.fillRect(0, 0, w, h);
        drawCloud(ctx, dust, w, h, t / 1000, dark);
        ctx.fillStyle = dark ? '#fff' : '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `300 ${Math.min(50, w * 0.072)}px system-ui`; ctx.fillText('Resonant Relay', w / 2, h / 2);
        const cols = w < 600 ? 8 : 16, rows = Math.ceil(h / (w / cols));
        const tw = w / cols, th = h / rows;
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          const edge = Math.min(col, cols - col - 1, row, rows - row - 1);
          const delay = edge * 125 + ((row * 17 + col * 11) % 7) * 24;
          const flip = Math.max(0, Math.min(1, (t - 10600 - delay) / 620));
          if (flip === 1) continue;
          const width = tw * Math.cos(flip * Math.PI / 2);
          ctx.fillStyle = '#000'; ctx.fillRect(col * tw + (tw - width) / 2, row * th, width + 0.5, th + 0.5);
          if (flip > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.sin(flip * Math.PI) * 0.16})`; ctx.fillRect(col * tw + (tw - width) / 2, row * th, 1, th); }
        }
      }
      ctx.globalAlpha = 1;
      if (elapsed >= 12500) { finish(); return; }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); logo.onload = null; window.removeEventListener('resize', resize); };
  }, [active, visible]);

  if (!visible) return null;
  return <div className="beta-intro" role="dialog" aria-modal="true" aria-label="Relay introduction" onKeyDown={(event) => {
    if (event.key === 'Escape') finish();
    if (event.key === 'Tab') {
      const controls = event.currentTarget.querySelectorAll<HTMLButtonElement>('button');
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <canvas ref={canvasRef} aria-hidden="true" />
    <button ref={skipRef} className="beta-intro-skip" onClick={finish}>Skip intro</button>
    {!active && <button className="beta-intro-start" data-relay-sound="none" onClick={() => {
      if (reducedMotion()) { finish(); return; }
      const audio = new Audio(`${BASE_PATH}/audio/startup-humordome.mp3`);
      audio.volume = 0.28; audioRef.current = audio; void audio.play().catch(() => {});
      setActive(true); skipRef.current?.focus();
    }}><span className="beta-seed" /><span>tap to begin</span></button>}
  </div>;
}
