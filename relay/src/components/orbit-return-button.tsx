'use client';

import { ARROW_ORBIT_URL } from '@/lib/config';

type ArrowOSWindow = Window & {
  ArrowOS?: {
    launchToOrbit?: (module: string, anchor?: HTMLElement) => void;
  };
};

export function OrbitReturnButton() {
  const launch = (event: React.MouseEvent<HTMLButtonElement>) => {
    const arrowOS = (window as ArrowOSWindow).ArrowOS;
    if (arrowOS?.launchToOrbit) {
      arrowOS.launchToOrbit('relay', event.currentTarget);
      return;
    }

    const destination = new URL(ARROW_ORBIT_URL, window.location.origin);
    destination.searchParams.set('from', 'relay');
    window.location.assign(destination.toString());
  };

  return (
    <button
      type="button"
      className="arrow-orbit-return"
      aria-label="Back to Orbit"
      title="Back to Orbit"
      onClick={launch}
    >
      <span className="arrow-orbit-return-mark" aria-hidden="true"><span /></span>
      <span className="arrow-orbit-return-label">Orbit</span>
    </button>
  );
}

// Arrival is handled by Orbit's canonical ARROW shell. Keeping this export
// as a no-op avoids duplicate landing animations in older Relay imports.
export function OrbitArrivalReceiver() {
  return null;
}
