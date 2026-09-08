'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { appPathname, BASE_PATH } from '@/lib/config';
import { drawCloud, emitParticles, INTRO_DONE, introSeen, makeDust, PAGE_MOTION_MS, PARTICLE_EVENT, reducedMotion, type ParticleCue } from '@/lib/particle-motion';

function ParticleField() {
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const effectRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const background = backgroundRef.current!, canvas = effectRef.current!;
    const bg = background.getContext('2d'), fx = canvas.getContext('2d');
    if (!bg || !fx) return;
    let w = 0, h = 0, frame = 0, last = 0, clock = 0;
    let pointerX = 0, pointerY = 0, mouseX = 0, mouseY = 0;
    let dark = document.documentElement.classList.contains('dark');
    let cue: (ParticleCue & { started: number }) | null = null;
    const dust = makeDust(window.innerWidth < 600 ? 2000 : 4200);
    const sparks = makeDust(window.innerWidth < 600 ? 850 : 1600);
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [background, canvas]) { c.width = w * dpr; c.height = h * dpr; }
      bg.setTransform(dpr, 0, 0, dpr, 0, 0); fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new MutationObserver(() => { dark = document.documentElement.classList.contains('dark'); });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const onCue = (event: Event) => {
      const next = (event as CustomEvent<ParticleCue>).detail;
      // A route click must not cut a theme wave off before the color switches.
      if (cue?.kind === 'theme' && next.kind !== 'theme') return;
      cue = { ...next, started: performance.now() };
    };
    const onPointer = (event: PointerEvent) => { pointerX = event.clientX / w * 2 - 1; pointerY = event.clientY / h * 2 - 1; };
    const draw = (now: number) => {
      const reduce = reducedMotion();
      if (!document.hidden && now - last >= (reduce ? 120 : 30)) {
        clock += Math.min((now - last) / 1000, 0.05); last = now;
        mouseX += (pointerX - mouseX) * 0.08; mouseY += (pointerY - mouseY) * 0.08;
        bg.clearRect(0, 0, w, h); fx.clearRect(0, 0, w, h);
        drawCloud(bg, dust, w, h, reduce ? 0 : clock, dark, reduce ? 0 : mouseX, reduce ? 0 : mouseY);
        if (cue && !reduce) {
          const duration = cue.kind === 'theme' ? 1300 : PAGE_MOTION_MS;
          const p = Math.min(1, (now - cue.started) / duration);
          if (cue.kind === 'theme') {
            const color = cue.dark ? '#0a0a0b' : '#fff';
            const radius = Math.hypot(w, h) * Math.min(1, p * 2);
            fx.fillStyle = color; fx.globalAlpha = p < 0.52 ? 1 : Math.max(0, (1 - p) / 0.48);
            fx.beginPath(); fx.arc(w / 2, h / 2, Math.max(0, radius - 75), 0, Math.PI * 2); fx.fill();
            for (const s of sparks) {
              const r = Math.max(0, radius - s.depth * 160);
              const size = 0.8 + s.depth * 3;
              fx.fillRect(w / 2 + Math.cos(s.angle) * r, h / 2 + Math.sin(s.angle) * r, size, size);
            }
          } else {
            const q = cue.kind === 'close' ? 1 - p : p;
            const spread = 1 - Math.pow(1 - q, 2);
            fx.fillStyle = dark ? '#fff' : '#111';
            for (const s of sparks) {
              const startX = w / 2 + Math.cos(s.angle) * 65 * s.radius;
              const startY = h / 2 + Math.sin(s.angle) * 25 * s.radius;
              // A rectangular field traces the panel area, not a generic radial flash.
              const endX = 24 + s.depth * (w - 48);
              const endY = 92 + s.radius * (h - 188);
              const arc = Math.sin(p * Math.PI) * Math.sin(s.phase) * 70;
              fx.globalAlpha = Math.sin(p * Math.PI) * (0.35 + s.depth * 0.65);
              fx.fillRect(startX + (endX - startX) * spread + arc, startY + (endY - startY) * spread, s.size + 0.4, s.size + 0.4);
            }
          }
          fx.globalAlpha = 1;
          if (p === 1) cue = null;
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize); window.addEventListener('pointermove', onPointer, { passive: true }); window.addEventListener(PARTICLE_EVENT, onCue);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onPointer); window.removeEventListener(PARTICLE_EVENT, onCue); };
  }, []);
  return <><canvas ref={backgroundRef} className="beta-cloud" aria-hidden="true" /><canvas ref={effectRef} className="beta-particle-effects" aria-hidden="true" /></>;
}

export function BetaExperience({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const routeChanged = useRef<() => void>(() => {});

  useEffect(() => {
    const root = rootRef.current!;
    const page = () => root.querySelector<HTMLElement>('.relay-mobile-main');
    let timer = 0, fallback = 0;
    let desired: string | null = null, navigating = false, closing = false;
    const isSpace = () => appPathname(window.location.pathname).replace(/\/$/, '') === '/space';
    const phase = (value: string) => {
      const panel = page();
      if (panel) { panel.dataset.phase = value; panel.inert = value === 'closing' || value === 'hidden'; }
    };
    const reveal = (delay = 0) => {
      window.clearTimeout(timer);
      if (isSpace()) { phase('hidden'); root.dataset.space = 'true'; return; }
      root.dataset.space = 'false'; phase('hidden');
      timer = window.setTimeout(() => {
        phase('opening'); emitParticles({ kind: 'open' });
        timer = window.setTimeout(() => { phase('open'); }, reducedMotion() ? 0 : PAGE_MOTION_MS);
      }, delay);
    };
    const ready = () => {
      root.dataset.ready = 'true';
      reveal(reducedMotion() ? 0 : 850);
    };
    if (introSeen()) ready(); else phase('hidden');
    window.addEventListener(INTRO_DONE, ready);

    const navigate = () => {
      if (!desired) return;
      navigating = true; closing = false;
      const href = desired; desired = null;
      // Next adds the configured basePath itself. Preserve query strings.
      router.push(href.slice(BASE_PATH.length) || '/');
      fallback = window.setTimeout(() => { window.location.assign(desired ?? href); }, 8000);
    };
    const begin = () => {
      if (navigating || closing) return;
      window.clearTimeout(timer);
      closing = true;
      phase('closing'); emitParticles({ kind: 'close' });
      timer = window.setTimeout(() => { phase('hidden'); root.dataset.space = 'true'; timer = window.setTimeout(navigate, reducedMotion() ? 0 : 120); }, reducedMotion() || isSpace() ? 0 : PAGE_MOTION_MS);
    };
    routeChanged.current = () => {
      window.clearTimeout(fallback); navigating = false;
      if (desired && desired !== window.location.pathname + window.location.search) { closing = false; begin(); }
      else { desired = null; closing = false; if (root.dataset.ready === 'true') reveal(); }
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (!link || !root.contains(link) || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith(`${BASE_PATH}/`) || url.hash) return;
      const path = appPathname(url.pathname);
      if (!/^\/(?:$|space\/?$|chats(?:\/|$)|todo(?:\/|$)|planner(?:\/|$)|calendar(?:\/|$)|email(?:\/|$)|contacts(?:\/|$)|profile(?:\/|$)|admin(?:\/|$)|support(?:\/|$)|notifications(?:\/|$))/.test(path)) return;
      // Same-path query navigation stays native, preserving view/filter behavior.
      if (url.pathname === window.location.pathname) {
        if (url.search !== window.location.search) return;
        event.preventDefault();
        if (navigating) desired = url.pathname + url.search;
        else if (closing) { desired = null; closing = false; reveal(); }
        return;
      }
      event.preventDefault();
      desired = url.pathname + url.search;
      begin();
    };
    root.addEventListener('click', click);
    return () => { clearTimeout(timer); clearTimeout(fallback); window.removeEventListener(INTRO_DONE, ready); root.removeEventListener('click', click); routeChanged.current = () => {}; };
  }, [router]);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    routeChanged.current();
  }, [pathname]);

  return <div ref={rootRef} className="beta-experience" data-ready="false" data-space={appPathname(pathname).replace(/\/$/, '') === '/space'}>
    <ParticleField />
    <h1 className="beta-landing-title" aria-hidden={appPathname(pathname).replace(/\/$/, '') !== '/space'}>Resonant Relay</h1>
    {children}
  </div>;
}
