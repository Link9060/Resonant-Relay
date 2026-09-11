'use client';

import { useEffect, useRef, useState } from 'react';
import { createCloudRenderer, fitCanvas } from '@/lib/particle-renderer';
import { appPageUrl, appPathname, BASE_PATH } from '@/lib/config';
import { BETA_INTRO_KEY, INTRO_DONE, introSeen, makeDust, reducedMotion } from '@/lib/particle-motion';
import { readParticlePreferences } from '@/lib/particle-preferences';
import { readSoundPreference } from '@/lib/sound-preferences';

// A deliberate 2.7s formation and 3s hold lead into a brief 850ms flight.
// Preserve the one-second blackout before the final tile reveal.
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
    const path = appPathname(window.location.pathname).replace(/\/$/, '') || '/';
    const publicRoute = /^\/(?:login|auth|beta-access|onboarding)(?:\/|$)/.test(path);
    if (!publicRoute && path !== '/space') {
      window.location.replace(appPageUrl('/space'));
      return;
    }
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
    const preferences = readParticlePreferences();
    const dust = makeDust(Math.round((window.innerWidth < 600 ? 950 : 1650) * preferences.density));
    const renderCloud = createCloudRenderer(window.innerWidth < 600, preferences);
    const raster = document.createElement('canvas');
    const rc = raster.getContext('2d', { willReadFrequently: true })!;
    let points: { x: number; y: number; delay: number; angle: number; r: number }[] = [];
    const logo = new Image();
    let logoReady = false;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      fitCanvas(canvas, ctx, w, h);
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
      const pointStep = preferences.density < 0.8 ? 4 : preferences.density < 1.45 ? 3 : 2;
      for (let y = Math.floor(h / 2 - 70); y < Math.min(h, h / 2 + 70); y += pointStep) {
        for (let x = 0; x < w; x += pointStep) {
          if ((pixels[(y * w + x) * 4 + 3] ?? 0) > 100) points.push({ x, y, delay: Math.random(), angle: Math.random() * Math.PI * 2, r: 40 + Math.random() * 230 });
        }
      }
    };
    resize();
    logo.onload = () => { if (elapsed < 800) { logoReady = true; resize(); } };
    logo.src = `${BASE_PATH}/relay-icon.svg`;
    const draw = (now: number) => {
      if (previous && !document.hidden) elapsed += now - previous;
      previous = now;
      ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      const t = elapsed;
      if (t < 5700) {
        const solid = Math.max(0, Math.min(1, (t - 2300) / 400));
        if (solid < 1) for (const p of points) {
          const v = Math.max(0, Math.min(1, (t - 680 - p.delay * 150) / 1500));
          const ease = 1 - Math.pow(1 - v, 3);
          const burst = 1 - Math.pow(1 - Math.max(0, Math.min(1, (t - 160) / 700)), 3);
          const bx = w / 2 + Math.cos(p.angle) * p.r * burst;
          const by = h / 2 + Math.sin(p.angle) * p.r * burst;
          ctx.globalAlpha = (1 - solid) * Math.min(1, t / 120);
          const dot = 1.25 * preferences.size;
          ctx.fillStyle = '#fff'; ctx.fillRect(bx + (p.x - bx) * ease, by + (p.y - by) * ease, dot, dot);
        }
        if (t < 550) { ctx.globalAlpha = Math.max(0, 1 - t / 550); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w / 2, h / 2, 6 * (1 + Math.sin(t / 550 * Math.PI) * 0.4), 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = solid; ctx.drawImage(raster, 0, 0);
      } else if (t < 7600) {
        const dissolve = Math.min(1, (t - 5700) / 1100);
        const pulse = t >= 6800 && t < 7300 ? Math.sin((t - 6800) / 500 * Math.PI) : 0;
        const explode = Math.max(0, (t - 7300) / 300);
        if (dissolve < 1) {
          ctx.globalAlpha = 1; ctx.drawImage(raster, 0, 0);
          ctx.fillStyle = '#000';
          for (const p of points) if (p.delay < dissolve) ctx.fillRect(p.x - preferences.size, p.y - preferences.size, 4 * preferences.size, 4 * preferences.size);
        }
        ctx.fillStyle = '#fff';
        for (const p of points) {
          if (p.delay > dissolve) continue;
          const drift = Math.max(0, dissolve - p.delay) * 15;
          const scale = 1 + pulse * 0.13 + explode * explode * 18;
          ctx.globalAlpha = 0.65 + pulse * 0.35;
          const x = w / 2 + (p.x - w / 2 + Math.cos(p.angle) * drift) * scale;
          const y = h / 2 + (p.y - h / 2 + Math.sin(p.angle) * drift) * scale;
          ctx.beginPath(); ctx.arc(x, y, (0.78 + pulse * 0.8) * preferences.size, 0, Math.PI * 2); ctx.fill();
        }
      } else if (t < 8450) {
        const warp = (t - 7600) / 850;
        ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(0.65, preferences.size * 0.72);
        for (const p of dust) {
          const z = (p.depth + warp * 1.4) % 1;
          const radius = 7 + z * z * Math.max(w, h);
          const length = (8 + z * z * 180) * Math.min(1, warp * 5);
          ctx.globalAlpha = z * 0.75 * Math.min(1, (1 - warp) * 7);
          ctx.beginPath();
          ctx.moveTo(w / 2 + Math.cos(p.angle) * radius, h / 2 + Math.sin(p.angle) * radius);
          ctx.lineTo(w / 2 + Math.cos(p.angle) * (radius + length), h / 2 + Math.sin(p.angle) * (radius + length)); ctx.stroke();
        }
      } else if (t >= 9450) {
        ctx.globalAlpha = 1;
        const dark = document.documentElement.classList.contains('dark');
        ctx.fillStyle = dark ? '#0a0a0b' : '#fff'; ctx.fillRect(0, 0, w, h);
        renderCloud(ctx, w / 2, h / 2, w, (t - 9450) / 1000, dark);
        ctx.fillStyle = dark ? '#fff' : '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = `300 ${Math.min(50, w * 0.072)}px system-ui`; ctx.fillText('Resonant Relay', w / 2, h / 2);
        const cols = w < 600 ? 8 : 16, rows = Math.ceil(h / (w / cols));
        const tw = w / cols, th = h / rows;
        for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
          const edge = Math.min(col, cols - col - 1, row, rows - row - 1);
          const delay = edge * 110 + ((row * 17 + col * 11) % 7) * 24;
          const flip = Math.max(0, Math.min(1, (t - 9450 - delay) / 550));
          if (flip === 1) continue;
          const width = tw * Math.cos(flip * Math.PI / 2);
          ctx.fillStyle = '#000'; ctx.fillRect(col * tw + (tw - width) / 2, row * th, width + 0.5, th + 0.5);
          if (flip > 0) { ctx.fillStyle = `rgba(255,255,255,${Math.sin(flip * Math.PI) * 0.16})`; ctx.fillRect(col * tw + (tw - width) / 2, row * th, 1, th); }
        }
      }
      ctx.globalAlpha = 1;
      if (elapsed >= 10800) { finish(); return; }
      frame = requestAnimationFrame(draw);
    };
    const visibility = () => { previous = 0; if (document.hidden) audioRef.current?.pause(); };
    frame = requestAnimationFrame(draw);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(frame); logo.onload = null; window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange', visibility); };
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
      if (readSoundPreference()) {
        const audio = new Audio(`${BASE_PATH}/audio/startup-humordome.mp3`);
        audio.volume = 0.28;
        audioRef.current = audio;
        void audio.play().catch(() => {});
      }
      setActive(true); skipRef.current?.focus();
    }}><span className="beta-seed" /><span>tap to begin</span></button>}
  </div>;
}
