'use client';

import { useEffect, useRef } from 'react';

const TAU = Math.PI * 2;

export function PageLoading({ label = 'Loading your space' }: { label?: string }) {
  const coreRef = useRef<HTMLSpanElement>(null);
  const ringOneRef = useRef<HTMLSpanElement>(null);
  const ringTwoRef = useRef<HTMLSpanElement>(null);
  const particleRefs = useRef<Array<HTMLSpanElement | null>>([]);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const draw = (now: number) => {
      const elapsed = (now - startedAt) / 1000;
      const pulse = (Math.sin(elapsed * TAU / 1.45 - Math.PI / 2) + 1) / 2;

      if (coreRef.current) {
        const scale = reducedMotion ? 1 : 0.76 + pulse * 0.42;
        coreRef.current.style.transform = `scale(${scale})`;
        coreRef.current.style.opacity = String(0.5 + pulse * 0.5);
      }

      [ringOneRef.current, ringTwoRef.current].forEach((ring, index) => {
        if (!ring) return;
        const cycle = ((elapsed + index * 0.72) % 1.8) / 1.8;
        const scale = reducedMotion ? 1 : 0.48 + cycle * 0.9;
        ring.style.transform = `scale(${scale})`;
        ring.style.opacity = String(Math.sin(cycle * Math.PI) * 0.7);
      });

      particleRefs.current.forEach((particle, index) => {
        if (!particle) return;
        const angle = elapsed * (reducedMotion ? 0.65 : 2.7) + index * TAU / 3;
        const radius = 25 + Math.sin(elapsed * 1.8 + index * 1.4) * 5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.78;
        particle.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        particle.style.opacity = String(0.55 + ((Math.sin(angle * 1.5) + 1) / 2) * 0.45);
      });

      frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relay-loading" role="status" aria-live="polite">
      <div className="relay-loading-signal" aria-hidden="true">
        <span ref={ringOneRef} className="relay-loading-ring" />
        <span ref={ringTwoRef} className="relay-loading-ring" />
        <span ref={coreRef} className="relay-loading-core" />
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            ref={(element) => { particleRefs.current[index] = element; }}
            className="relay-loading-particle"
          />
        ))}
      </div>
      <p>{label}</p>
      <span className="sr-only">Please wait.</span>
    </div>
  );
}
