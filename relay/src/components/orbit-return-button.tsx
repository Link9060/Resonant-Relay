'use client';

const ORBIT_URL =
  process.env.NEXT_PUBLIC_ORBIT_SITE_URL ??
  'https://link9060.github.io/Resonant-Orbit/';

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

    const destination = new URL(ORBIT_URL);
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
