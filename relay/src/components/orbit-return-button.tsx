'use client';

import { useEffect, useRef, useState } from 'react';

const ORBIT_URL =
  process.env.NEXT_PUBLIC_ORBIT_SITE_URL ??
  'https://link9060.github.io/Resonant-Orbit/';

export function OrbitReturnButton() {
  const [launching, setLaunching] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const launch = () => {
    if (launching) return;

    setLaunching(true);
    const destination = new URL(ORBIT_URL);
    destination.searchParams.set('from', 'relay');

    timerRef.current = window.setTimeout(() => {
      window.location.assign(destination.toString());
    }, 920);
  };

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

      {launching && (
        <div className="arrow-orbit-launch" aria-live="polite" aria-label="Returning to Orbit">
          <div className="arrow-orbit-launch-grid" aria-hidden="true" />
          <span className="arrow-orbit-launch-ring ring-a" aria-hidden="true" />
          <span className="arrow-orbit-launch-ring ring-b" aria-hidden="true" />
          <span className="arrow-orbit-launch-craft" aria-hidden="true"><span /></span>
          <span className="arrow-orbit-launch-particle particle-a" aria-hidden="true" />
          <span className="arrow-orbit-launch-particle particle-b" aria-hidden="true" />
          <span className="arrow-orbit-launch-particle particle-c" aria-hidden="true" />
          <p>Returning to Orbit</p>
        </div>
      )}
    </>
  );
}
