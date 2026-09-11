'use client';

import { appUrl } from '@/lib/config';
import { useEffect } from 'react';

export function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let active = true;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(appUrl('/sw.js'), { scope: appUrl('/') });
        if (active) void registration.update();
      } catch (error) {
        console.warn('Relay service worker registration failed.', error);
      }
    };

    if (document.readyState === 'complete') void register();
    else window.addEventListener('load', register, { once: true });

    return () => {
      active = false;
      window.removeEventListener('load', register);
    };
  }, []);

  return null;
}
