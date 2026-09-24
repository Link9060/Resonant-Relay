'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ORBIT_URL =
  process.env.NEXT_PUBLIC_ORBIT_SITE_URL ??
  'https://link9060.github.io/Resonant-Orbit/';

export function OrbitReturnButton() {
  const [launching, setLaunching] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!launching) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.classList.add('arrow-orbit-is-launching');

    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.classList.remove('arrow-orbit-is-launching');
    };
  }, [launching]);

  const launch = () => {
    if (launching) return;

    setLaunching(true);

    const destination = new URL(ORBIT_URL);
    destination.searchParams.set('from', 'relay');

    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    timerRef.current = window.setTimeout(() => {
      window.location.assign(destination.toString());
    }, reduceMotion ? 100 : 1080);
  };

  const launchOverlay =
    mounted && launching
      ? createPortal(
          <div
            className="arrow-orbit-launch"
            role="status"
            aria-live="polite"
            aria-label="Returning to Orbit"
          >
            <div className="arrow-orbit-launch-grid" aria-hidden="true" />
            <span className="arrow-orbit-launch-ring ring-a" aria-hidden="true" />
            <span className="arrow-orbit-launch-ring ring-b" aria-hidden="true" />
            <span className="arrow-orbit-launch-craft" aria-hidden="true"><span /></span>
            <span className="arrow-orbit-launch-particle particle-a" aria-hidden="true" />
            <span className="arrow-orbit-launch-particle particle-b" aria-hidden="true" />
            <span className="arrow-orbit-launch-particle particle-c" aria-hidden="true" />
            <p>Returning to Orbit</p>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        type="button"
        className="arrow-orbit-return"
        aria-label="Back to Orbit"
        title="Back to Orbit"
        onClick={launch}
        disabled={launching}
      >
        <span className="arrow-orbit-return-mark" aria-hidden="true"><span /></span>
        <span className="arrow-orbit-return-label">Orbit</span>
      </button>
      {launchOverlay}
    </>
  );
}
