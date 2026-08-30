'use client';

import { removePushSubscription, savePushSubscription } from '@/lib/actions/notifications';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { appUrl, VAPID_PUBLIC_KEY } from '@/lib/config';

type Status = 'checking' | 'unsupported' | 'denied' | 'off' | 'on';

export function PushToggle() {
  const [status, setStatus] = useState<Status>('checking');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }
      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration();
      const existing = await registration?.pushManager.getSubscription();
      setStatus(existing ? 'on' : 'off');
    })();
  }, []);

  async function enable() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.register(appUrl('/sw.js'), { scope: appUrl('/') });
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(VAPID_PUBLIC_KEY),
      });

      const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const result = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys });
      setStatus(result.ok ? 'on' : 'off');
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus('off');
    } finally {
      setLoading(false);
    }
  }

  if (status === 'checking') return null;

  if (status === 'unsupported') {
    return <p className="text-xs text-ink-faint">Push notifications aren&apos;t supported in this browser.</p>;
  }

  if (status === 'denied') {
    return (
      <p className="text-xs text-ink-faint">
        Notifications are blocked for Relay in your browser settings. Allow them there to turn this on.
      </p>
    );
  }

  return (
    <button
      onClick={status === 'on' ? disable : enable}
      disabled={loading}
      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-40"
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : status === 'on' ? (
        <BellOff size={16} />
      ) : (
        <Bell size={16} />
      )}
      {status === 'on' ? 'Turn off notifications' : 'Turn on notifications'}
    </button>
  );
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0))).buffer;
}
