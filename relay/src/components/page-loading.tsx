'use client';

import { BASE_PATH } from '@/lib/config';
import { useEffect, useRef } from 'react';

const TAU = Math.PI * 2;

export function PageLoading({ label = 'Loading your space' }: { label?: string }) {
  const logoRef = useRef<HTMLImageElement>(null);
  const ringOneRef = useRef<HTMLSpanElement>(null);
  const ringTwoRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();

    const draw = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const pulse = (Math.sin(elapsed * TAU / 1.7 - Math.PI / 2) + 1) / 2;

      if (logoRef.current) {
        logoRef.current.style.transform = `scale(${0.92 + pulse * 0.08})`;
        logoRef.current.style.opacity = String(0.72 + pulse * 0.28);
        logoRef.current.style.filter = `drop-shadow(0 0 ${5 + pulse * 12}px rgb(var(--ink) / ${0.08 + pulse * 0.12}))`;
      }

      [ringOneRef.current, ringTwoRef.current].forEach((ring, index) => {
        if (!ring) return;
        const cycle = ((elapsed + index * 0.78) % 2.15) / 2.15;
        ring.style.transform = `scale(${0.7 + cycle * 0.62})`;
        ring.style.opacity = String(Math.sin(cycle * Math.PI) * 0.34);
      });

      frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relay-loading" role="status" aria-live="polite">
      <div className="relay-loading-signal relay-loading-brand" aria-hidden="true">
        <span ref={ringOneRef} className="relay-loading-ring" />
        <span ref={ringTwoRef} className="relay-loading-ring" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={logoRef} src={`${BASE_PATH}/relay-icon.svg`} alt="" className="relay-loading-logo dark:invert" />
      </div>
      <p>{label}</p>
      <span className="sr-only">Please wait.</span>
    </div>
  );
}
