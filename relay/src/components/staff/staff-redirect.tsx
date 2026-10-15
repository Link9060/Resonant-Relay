'use client';
import { useEffect } from 'react';

type StaffQueue = 'requests' | 'email' | 'reports' | 'users' | 'beta' | 'overview' | 'audit';
export function StaffRedirect({ queue }: { queue: StaffQueue }) {
  const destination = '/Resonant-Relay/arrow/orbit/staff/?queue=' + queue;
  useEffect(() => { window.location.replace(destination); }, [destination]);
  return <main className="p-6"><h1>ARROW staff</h1><p>Staff controls are in Orbit.</p><a href={destination}>Open staff workspace</a></main>;
}
