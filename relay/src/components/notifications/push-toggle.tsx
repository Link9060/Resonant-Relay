'use client';

import { removePushSubscription, savePushSubscription } from '@/lib/actions/notifications';
import { appUrl, VAPID_PUBLIC_KEY } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { BellOff, BellRing, Laptop, Loader2, Smartphone } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type Status = 'checking' | 'unsupported' | 'setup' | 'denied' | 'off' | 'on';

export function PushToggle() {
  const [status, setStatus] = useState<Status>('checking');
  const [serverKey, setServerKey] = useState(VAPID_PUBLIC_KEY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setStatus('unsupported');
        return;
      }

      const health = await createClient().functions.invoke('push-dispatch', { body: { action: 'health' } });
      const publicKey = typeof health.data?.publicKey === 'string' ? health.data.publicKey : VAPID_PUBLIC_KEY;
      if (health.error || !health.data?.configured || !publicKey) {
        setStatus('setup');
        return;
      }
      setServerKey(publicKey);

      if (Notification.permission === 'denied') {
        setStatus('denied');
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration(appUrl('/'));
      let existing = await registration?.pushManager.getSubscription() ?? null;

      if (existing && !subscriptionUsesKey(existing, publicKey)) {
        await removePushSubscription(existing.endpoint);
        await existing.unsubscribe();
        existing = null;

        if (Notification.permission === 'granted' && registration) {
          existing = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToArrayBuffer(publicKey),
          });
        }
      }

      if (existing) await persist(existing);
      setStatus(existing ? 'on' : 'off');
    })().catch(() => setStatus('off'));
  }, []);

  async function enable() {
    setLoading(true);
    setError(null);
    try {
      await navigator.serviceWorker.register(appUrl('/sw.js'), { scope: appUrl('/') });
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(serverKey),
      });

      const saved = await persist(subscription);
      setStatus(saved ? 'on' : 'off');
      if (!saved) setError('Relay could not save this device. Try again.');
    } catch {
      setStatus('off');
      setError('Notifications could not be enabled on this device.');
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration(appUrl('/'));
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

  return (
    <div className="w-full rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-canvas text-ink-muted">
          <BellRing size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-medium text-ink">Device notifications</h3>
              <p className="mt-0.5 text-xs text-ink-faint">Messages and requests, even when Relay is closed.</p>
            </div>
            {status === 'checking' ? (
              <Loader2 size={16} className="animate-spin text-ink-faint" />
            ) : status === 'on' || status === 'off' ? (
              <button type="button" role="switch" aria-checked={status === 'on'} aria-label="Device notifications" disabled={loading} onClick={() => void (status === 'on' ? disable() : enable())} className={`relative h-6 w-11 rounded-full border transition-colors disabled:opacity-50 ${status === 'on' ? 'border-ink bg-ink' : 'border-border bg-surface'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform ${status === 'on' ? 'translate-x-5 bg-canvas' : 'translate-x-0.5 bg-ink-faint'}`} />
              </button>
            ) : null}
          </div>

          {status === 'on' && <StatusLine icon={Laptop}>Enabled on this device</StatusLine>}
          {status === 'off' && <p className="mt-3 text-xs leading-5 text-ink-faint">Turn this on separately on every Mac, Chromebook, or phone where you want alerts.</p>}
          {status === 'unsupported' && <StatusLine icon={Smartphone}>On iPhone or iPad, add Relay to your Home Screen in Safari, open the installed app, then return here.</StatusLine>}
          {status === 'setup' && <p className="mt-3 text-xs leading-5 text-ink-faint">Relay&apos;s notification service is temporarily unavailable. In-app alerts still work.</p>}
          {status === 'denied' && <StatusLine icon={BellOff}>Notifications are blocked. Allow Relay in this browser&apos;s site settings, then reload.</StatusLine>}
          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function StatusLine({ icon: Icon, children }: { icon: typeof Laptop; children: ReactNode }) {
  return <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-ink-faint"><Icon size={14} className="mt-0.5 shrink-0" />{children}</p>;
}

async function persist(subscription: PushSubscription) {
  const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false;
  const result = await savePushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
  return result.ok;
}

function subscriptionUsesKey(subscription: PushSubscription, publicKey: string) {
  const current = subscription.options.applicationServerKey;
  if (!current) return false;
  const expected = new Uint8Array(urlBase64ToArrayBuffer(publicKey));
  const actual = new Uint8Array(current);
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0))).buffer;
}
