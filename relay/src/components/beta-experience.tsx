'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { appPathname, BASE_PATH } from '@/lib/config';
import { createCloudRenderer, fitCanvas } from '@/lib/particle-renderer';
import { createWorkspaceTransition, PANEL_CLOSE_MS, PANEL_OPEN_MS } from '@/lib/workspace-transition';
import { emitParticles, INTRO_DONE, introSeen, makeDust, PARTICLE_EVENT, reducedMotion, type ParticleCue } from '@/lib/particle-motion';
import { PARTICLE_PREFERENCES_EVENT, readParticlePreferences, type ParticlePreferences } from '@/lib/particle-preferences';

export function ParticleField() {
  const backgroundRef = useRef<HTMLCanvasElement>(null);
  const effectRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const background = backgroundRef.current!, canvas = effectRef.current!;
    const root = canvas.closest<HTMLElement>('.beta-experience')!;
    const bg = background.getContext('2d'), fx = canvas.getContext('2d');
    if (!bg || !fx || !root) return;
    let preferences = readParticlePreferences();
    let renderCloud = createCloudRenderer(window.innerWidth < 600, preferences);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let sparks = makeDust(Math.round((window.innerWidth < 600 ? 700 : 1450) * preferences.density));
    let w = 0, h = 0, cx = 0, cy = 0, areaWidth = 0;
    let frame = 0, last = 0, clock = 0, dirty = true;
    let pointerX = 0, pointerY = 0, pointerClientX = 0, pointerClientY = 0;
    let mouseX = 0, mouseY = 0, hover = 0, targetHover = 0;
    let dark = document.documentElement.classList.contains('dark');
    let cue: (ParticleCue & { started: number }) | null = null;
    let impact: { x: number; y: number; started: number } | null = null;
    let bounds = { left: 24, top: 80, width: 0, height: 0 };
    const measure = () => {
      const rect = root.querySelector('.relay-mobile-main')?.getBoundingClientRect();
      bounds = { left: rect?.left ?? 24, top: Math.max(72, rect?.top ?? 80), width: rect?.width ?? w - 48, height: Math.min(h - 100, rect?.height ?? h - 100) };
      const rail = root.querySelector('.relay-desktop-dock')?.getBoundingClientRect();
      const left = w >= 768 ? rail?.width ?? 0 : 0;
      areaWidth = w - left; cx = left + areaWidth / 2; cy = h / 2;
    };
    const wake = () => { dirty = true; if (!frame && !document.hidden) frame = requestAnimationFrame(draw); };
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      fitCanvas(background, bg, w, h); fitCanvas(canvas, fx, w, h);
      measure(); wake();
    };
    const draw = (now: number) => {
      frame = 0;
      if (document.hidden) return;
      const loading = root.dataset.loading === 'true';
      const showCloud = root.dataset.ready === 'true' && (root.dataset.space === 'true' || loading);
      if (!showCloud && !cue && !impact) {
        bg.clearRect(0, 0, w, h); fx.clearRect(0, 0, w, h);
        last = 0; return;
      }
      const interval = cue || impact || loading ? 1000 / 60 : 1000 / 30;
      if (!dirty && now - last < interval - 1) { frame = requestAnimationFrame(draw); return; }
      const costStart = performance.now();
      clock += last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now; dirty = false;
      mouseX += (pointerX - mouseX) * 0.08; mouseY += (pointerY - mouseY) * 0.08;
      hover += (targetHover - hover) * 0.1;
      bg.clearRect(0, 0, w, h); fx.clearRect(0, 0, w, h);
      const impactProgress = impact ? Math.min(1, (now - impact.started) / 820) : 1;
      const impulse = impact && impactProgress < 1 ? Math.sin(impactProgress * Math.PI) : 0;
      if (showCloud) renderCloud(bg, cx, cy, areaWidth, media.matches ? 0 : clock, dark, media.matches ? {} : {
        mx: mouseX, my: mouseY, hover, impulse, loading,
        pointerX: pointerClientX - cx, pointerY: pointerClientY - cy,
      });
      if (impact && impactProgress < 1 && !media.matches) {
        const radius = 18 + Math.pow(impactProgress, 0.72) * Math.min(areaWidth * 0.38, 330);
        fx.fillStyle = dark ? '#fff' : '#111';
        for (let i = 0; i < Math.min(260, sparks.length); i++) {
          const s = sparks[i]!;
          const r = radius + (s.depth - 0.5) * 38;
          fx.globalAlpha = (1 - impactProgress) * (0.18 + s.depth * 0.5);
          const dot = Math.max(0.8, (s.size + 0.7) * preferences.size);
          fx.fillRect(impact.x + Math.cos(s.angle) * r, impact.y + Math.sin(s.angle) * r, dot, dot);
        }
        fx.globalAlpha = 1;
      } else impact = null;
      if (cue && !media.matches) {
        const duration = cue.kind === 'theme' ? 1000 : cue.kind === 'open' ? PANEL_OPEN_MS : PANEL_CLOSE_MS;
        const p = Math.min(1, (now - cue.started) / duration);
        if (cue.kind === 'theme') {
          const radius = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) * Math.min(1.2, p * 2.5);
          fx.fillStyle = cue.dark ? '#0a0a0b' : '#fff';
          fx.globalAlpha = p < 0.5 ? 1 : (1 - p) * 2;
          fx.beginPath(); fx.arc(cx, cy, Math.max(0, radius - 28), 0, Math.PI * 2); fx.fill();
          for (const s of sparks) {
            const r = Math.max(0, radius - s.depth * 85);
            const dot = (1 + s.depth * 2.5) * preferences.size;
            fx.fillRect(cx + Math.cos(s.angle) * r, cy + Math.sin(s.angle) * r, dot, dot);
          }
        } else {
          const q = cue.kind === 'close' ? 1 - p : p;
          const spread = 1 - Math.pow(1 - q, 3);
          fx.fillStyle = dark ? '#fff' : '#111';
          for (const s of sparks) {
            const startX = cx + Math.cos(s.angle) * 90 * s.radius;
            const startY = cy + Math.sin(s.angle) * 35 * s.radius;
            const endX = bounds.left + s.depth * bounds.width;
            const endY = bounds.top + s.radius * bounds.height;
            fx.globalAlpha = Math.sin(p * Math.PI) * (0.2 + s.depth * 0.45);
            const dot = (s.size + 0.7) * preferences.size;
            fx.fillRect(startX + (endX - startX) * spread, startY + (endY - startY) * spread, dot, dot);
          }
        }
        fx.globalAlpha = 1;
        if (p === 1) { cue = null; fx.clearRect(0, 0, w, h); }
      } else cue = null;
      if (process.env.NODE_ENV === 'development') background.dataset.drawMs = (performance.now() - costStart).toFixed(2);
      if (!media.matches && (showCloud || cue || impact || hover !== targetHover)) frame = requestAnimationFrame(draw);
    };
    const observer = new MutationObserver(() => { measure(); wake(); });
    observer.observe(root, { attributes: true, subtree: true, childList: true, attributeFilter: ['data-space', 'data-ready', 'data-loading', 'data-dock-collapsed'] });
    const layoutObserver = new ResizeObserver(() => { measure(); wake(); });
    root.querySelectorAll('.relay-desktop-dock, .relay-mobile-main').forEach(element => layoutObserver.observe(element));
    const themeObserver = new MutationObserver(() => { dark = document.documentElement.classList.contains('dark'); wake(); });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const onCue = (event: Event) => {
      const next = (event as CustomEvent<ParticleCue>).detail;
      if (cue?.kind === 'theme' && next.kind !== 'theme') return;
      measure(); cue = { ...next, started: performance.now() }; wake();
    };
    const onPointer = (event: PointerEvent) => {
      pointerClientX = event.clientX; pointerClientY = event.clientY;
      pointerX = (event.clientX - cx) / Math.max(1, areaWidth / 2);
      pointerY = (event.clientY - cy) / Math.max(1, h / 2);
      targetHover = Math.max(0, 1 - Math.hypot((event.clientX - cx) / Math.max(1, areaWidth * 0.42), (event.clientY - cy) / Math.max(1, h * 0.26)));
      wake();
    };
    const onPointerLeave = () => { targetHover = 0; wake(); };
    const onPointerDown = (event: PointerEvent) => {
      if (root.dataset.ready !== 'true' || (root.dataset.space !== 'true' && root.dataset.loading !== 'true')) return;
      if (Math.hypot((event.clientX - cx) / Math.max(1, areaWidth * 0.42), (event.clientY - cy) / Math.max(1, h * 0.28)) > 1.2) return;
      impact = { x: event.clientX, y: event.clientY, started: performance.now() };
      wake();
    };
    let preferenceTimer = 0;
    const onPreferences = (event: Event) => {
      preferences = (event as CustomEvent<ParticlePreferences>).detail;
      window.clearTimeout(preferenceTimer);
      preferenceTimer = window.setTimeout(() => {
        renderCloud = createCloudRenderer(window.innerWidth < 600, preferences);
        sparks = makeDust(Math.round((window.innerWidth < 600 ? 700 : 1450) * preferences.density));
        wake();
      }, 80);
    };
    const visibility = () => { cancelAnimationFrame(frame); frame = 0; last = 0; wake(); };
    resize();
    window.addEventListener('resize', resize); window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave); window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener(PARTICLE_PREFERENCES_EVENT, onPreferences);
    window.addEventListener(PARTICLE_EVENT, onCue); document.addEventListener('visibilitychange', visibility); media.addEventListener('change', wake);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); layoutObserver.disconnect(); themeObserver.disconnect();
      window.clearTimeout(preferenceTimer);
      window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onPointer); window.removeEventListener('pointerleave', onPointerLeave); window.removeEventListener('pointerdown', onPointerDown); window.removeEventListener(PARTICLE_EVENT, onCue);
      window.removeEventListener(PARTICLE_PREFERENCES_EVENT, onPreferences);
      document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', wake);
    };
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
    const current = () => window.location.pathname + window.location.search;
    const landing = (href: string) => appPathname(href.split('?')[0]!).replace(/\/$/, '') === '/space';
    const controller = createWorkspaceTransition({
      current, landing, reduced: reducedMotion,
      phase(value) {
        const panel = page();
        if (panel) {
          panel.dataset.phase = value;
          panel.inert = value === 'closing' || value === 'hidden';
          panel.setAttribute('aria-busy', String(value !== 'open' && !landing(current())));
        }
        root.dataset.space = String(landing(current()));
      },
      particles: kind => emitParticles({ kind }),
      navigate: href => router.push(href.slice(BASE_PATH.length) || '/'),
      recover: href => window.location.assign(href),
      schedule: (callback, ms) => window.setTimeout(callback, ms),
      cancel: id => window.clearTimeout(id),
    });
    let wasLoading = false;
    const syncLoading = () => {
      const loading = Boolean(root.querySelector('.relay-loading, [data-relay-loading]'));
      root.dataset.loading = String(loading);
      if (loading !== wasLoading) {
        wasLoading = loading;
        controller.holdForLoading(loading);
      }
    };
    const loadingObserver = new MutationObserver(syncLoading);
    loadingObserver.observe(root, { childList: true, subtree: true });
    syncLoading();
    const ready = () => {
      root.dataset.ready = 'true';
      controller.reveal(reducedMotion() ? 0 : 480);
    };
    if (introSeen()) ready();
    else if (page()) { page()!.dataset.phase = 'hidden'; page()!.inert = true; }
    window.addEventListener(INTRO_DONE, ready);
    routeChanged.current = () => { if (root.dataset.ready === 'true') controller.committed(); };
    const history = () => controller.historyChanged();
    window.addEventListener('popstate', history);
    const prefetched = new Set<string>();
    const prefetch = (event: Event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a.relay-dock-link[href], a.relay-brand-lockup[href]');
      if (!link) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || prefetched.has(url.pathname)) return;
      prefetched.add(url.pathname);
      router.prefetch(url.pathname.slice(BASE_PATH.length) || '/');
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (!link || !root.contains(link) || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith(`${BASE_PATH}/`) || url.hash) return;
      const path = appPathname(url.pathname);
      if (!/^\/(?:$|space\/?$|chats(?:\/|$)|todo(?:\/|$)|planner(?:\/|$)|calendar(?:\/|$)|email(?:\/|$)|contacts(?:\/|$)|profile(?:\/|$)|admin(?:\/|$)|support(?:\/|$)|notifications(?:\/|$))/.test(path)) return;
      // Preserve native same-page query/filter behavior.
      if (url.pathname === window.location.pathname && url.search !== window.location.search) return;
      event.preventDefault();
      controller.request(url.pathname + url.search);
    };
    root.addEventListener('click', click);
    root.addEventListener('pointerover', prefetch, { passive: true });
    root.addEventListener('focusin', prefetch);
    return () => {
      controller.dispose();
      loadingObserver.disconnect();
      window.removeEventListener(INTRO_DONE, ready); window.removeEventListener('popstate', history);
      root.removeEventListener('click', click); root.removeEventListener('pointerover', prefetch); root.removeEventListener('focusin', prefetch);
      routeChanged.current = () => {};
    };
  }, [router]);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    routeChanged.current();
  }, [pathname]);

  return <div ref={rootRef} className="beta-experience" data-ready="false" data-loading="false" data-space={appPathname(pathname).replace(/\/$/, '') === '/space'}>
    <ParticleField />
    <h1 className="beta-landing-title" aria-hidden={appPathname(pathname).replace(/\/$/, '') !== '/space'}>Resonant Relay</h1>
    {children}
  </div>;
}
