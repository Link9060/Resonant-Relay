'use client';

import { appPathname } from '@/lib/config';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Legacy Relay previously owned its own full-screen particle field, startup
// gate, and route-transition engine. ARROW now owns cross-app cinematic
// transitions, so Relay's experience wrapper is deliberately lightweight.
// Keeping the export names avoids breaking older imports while ensuring there
// is only one animation owner.
export function ParticleField() {
  return null;
}

export function BetaExperience({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const appPath = appPathname(pathname).replace(/\/$/, '');
  const space = appPath === '/space';
  const staff = appPath === '/admin' || appPath.startsWith('/admin/');

  return (
    <div
      className="beta-experience"
      data-ready="true"
      data-loading="false"
      data-minimal-loading="true"
      data-space={space}
      data-staff={staff}
    >
      {children}
    </div>
  );
}
