'use client';

import { appUrl } from '@/lib/config';
import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => { if (!('serviceWorker' in navigator)) return; const register = () => { void navigator.serviceWorker.register(appUrl('/sw.js'), { scope: appUrl('/') }); }; if (document.readyState === 'complete') register(); else window.addEventListener('load', register, { once: true }); return () => window.removeEventListener('load', register); }, []);
  return null;
}
