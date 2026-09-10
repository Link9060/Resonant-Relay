'use client';

import { removePushDevice, removePushSubscription, savePushSubscription } from '@/lib/actions/notifications';
import { appUrl, VAPID_PUBLIC_KEY } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { BellOff, BellRing, Check, Laptop, Loader2, Send, Smartphone, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';

type Status = 'checking' | 'unsupported' | 'install' | 'setup' | 'denied' | 'off' | 'on';
type Variant = 'card' | 'compact';
type PushDevice = {
  id: string;
  endpoint: string;
  device_name: string;
  created_at: string;
  last_seen_at: string;
};

export function PushToggle({ variant = 'card' }: { variant?: Variant }) {
  const [status, setStatus] = useState<Status>('checking');
  const [serverKey, setServerKey] = useState(VAPID_PUBLIC_KEY);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    if (variant !== 'card') return;
    const { data } = await createClient()
      .from('push_subscriptions')
      .select('id,endpoint,device_name,created_at,last_seen_at')
      .order('last_seen_at', { ascending: false });
    setDevices((data as PushDevice[] | null) ?? []);
  }, [variant]);

  useEffect(() => {
    void (async () => {
      await loadDevices();

      if (isIos() && !isStandalone()) {
        setStatus('install');
        return;
      }

      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
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

      if (existing) {
        setCurrentEndpoint(existing.endpoint);
        await persist(existing);
        await loadDevices();
      }
      setStatus(existing ? 'on' : 'off');
    })().catch(() => setStatus('off'));
  }, [loadDevices]);

  async function enable() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await navigator.serviceWorker.register(appUrl('/sw.js'), { scope: appUrl('/') });
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToArrayBuffer(serverKey),
      });

      const saved = await persist(subscription);
      setCurrentEndpoint(subscription.endpoint);
      setStatus(saved ? 'on' : 'off');
      if (saved) {
        setMessage('This device is ready for Relay alerts.');
        await loadDevices();
      } else {
        setError('Relay could not save this device. Try again.');
      }
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
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration(appUrl('/'));
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setCurrentEndpoint(null);
      setStatus('off');
      await loadDevices();
    } finally {
      setLoading(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setError(null);
    setMessage(null);
    try {
      const result = await createClient().functions.invoke('push-dispatch', { body: { action: 'test' } });
      if (result.error || !result.data?.ok) throw new Error('Test failed');
      setMessage(result.data?.cooldown ? 'A test alert was just sent.' : 'Test alert sent. It may take a moment to appear.');
    } catch {
      setError('The test alert could not be sent. Check this device and try again.');
    } finally {
      setTesting(false);
    }
  }

  async function removeDevice(device: PushDevice) {
    if (device.endpoint === currentEndpoint) {
      await disable();
      return;
    }
    if (!window.confirm(`Remove ${device.device_name} from Relay notifications?`)) return;
    const result = await removePushDevice(device.id);
    if (!result.ok) {
      setError('That device could not be removed.');
      return;
    }
    setDevices((current) => current.filter((item) => item.id !== device.id));
  }

  if (variant === 'compact') {
    return (
      <div className="border-b border-border bg-surface/35 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${status === 'on' ? 'border-ink/20 bg-ink text-canvas' : 'border-border bg-canvas text-ink-muted'}`}>
            {status === 'checking' ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-ink">Device alerts</p>
            <p className="mt-0.5 text-[11px] leading-4 text-ink-faint">{compactDescription(status)}</p>
          </div>
          {status === 'off' && <ActionButton onClick={() => void enable()} disabled={loading}>{loading ? <Loader2 size={13} className="animate-spin" /> : 'Enable'}</ActionButton>}
          {status === 'on' && <ActionButton onClick={() => void sendTest()} disabled={testing}>{testing ? <Loader2 size={13} className="animate-spin" /> : 'Test'}</ActionButton>}
        </div>
        {(message || error) && <p className={`mt-2 pl-11 text-[11px] ${error ? 'text-red-500' : 'text-ink-muted'}`}>{error ?? message}</p>}
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${status === 'on' ? 'border-ink/20 bg-ink text-canvas' : 'border-border bg-canvas text-ink-muted'}`}>
          {status === 'checking' ? <Loader2 size={17} className="animate-spin" /> : <BellRing size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-ink">Device notifications</h3>
              <p className="mt-0.5 text-xs text-ink-faint">Messages and requests, even when Relay is closed.</p>
            </div>
            {status === 'on' && (
              <div className="flex items-center gap-2">
                <ActionButton onClick={() => void sendTest()} disabled={testing}>{testing ? <Loader2 size={13} className="animate-spin" /> : <><Send size={13} /> Send test</>}</ActionButton>
                <button type="button" disabled={loading} onClick={() => void disable()} className="rounded-md px-2 py-1.5 text-xs font-medium text-ink-faint transition-colors hover:bg-surface hover:text-ink disabled:opacity-50">Turn off</button>
              </div>
            )}
            {status === 'off' && <ActionButton onClick={() => void enable()} disabled={loading}>{loading ? <Loader2 size={13} className="animate-spin" /> : <><BellRing size={13} /> Enable this device</>}</ActionButton>}
          </div>

          {status === 'on' && <StatusLine icon={Check}>Enabled on this device</StatusLine>}
          {status === 'off' && <p className="mt-3 text-xs leading-5 text-ink-faint">Enable alerts separately on every Mac, Chromebook, or phone where you use Relay.</p>}
          {status === 'install' && <StatusLine icon={Smartphone}>On iPhone or iPad: open Relay in Safari, tap Share, choose Add to Home Screen, then open Relay from its new icon and enable alerts here.</StatusLine>}
          {status === 'unsupported' && <StatusLine icon={Smartphone}>This browser cannot receive web notifications. Try current Chrome, Safari, or Edge.</StatusLine>}
          {status === 'setup' && <p className="mt-3 text-xs leading-5 text-ink-faint">Relay&apos;s notification service is temporarily unavailable. In-app alerts still work.</p>}
          {status === 'denied' && <StatusLine icon={BellOff}>{blockedGuidance()}</StatusLine>}
          {message && <p className="mt-3 text-xs text-ink-muted">{message}</p>}
          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
        </div>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-ink">Registered devices</p>
          <span className="text-[11px] text-ink-faint">{devices.length} {devices.length === 1 ? 'device' : 'devices'}</span>
        </div>
        {devices.length === 0 ? (
          <p className="mt-2 text-xs leading-5 text-ink-faint">No devices are registered yet. Enable this device to start receiving alerts.</p>
        ) : (
          <div className="mt-2 divide-y divide-border rounded-lg border border-border bg-canvas">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center gap-3 px-3 py-2.5">
                <Laptop size={15} className="shrink-0 text-ink-faint" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-ink">{device.device_name}{device.endpoint === currentEndpoint ? ' · This device' : ''}</p>
                  <p className="mt-0.5 text-[10px] text-ink-faint">Active {formatDeviceDate(device.last_seen_at)}</p>
                </div>
                <button type="button" aria-label={`Remove ${device.device_name}`} onClick={() => void removeDevice(device)} className="flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface hover:text-red-500"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({ children, disabled, onClick }: { children: ReactNode; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface disabled:opacity-50">{children}</button>;
}

function StatusLine({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-ink-faint"><Icon size={14} className="mt-0.5 shrink-0" />{children}</p>;
}

function compactDescription(status: Status) {
  if (status === 'on') return 'Ready on this device';
  if (status === 'off') return 'Get alerts outside Relay';
  if (status === 'install') return 'Add Relay to your iPhone Home Screen first';
  if (status === 'denied') return 'Blocked in browser or system settings';
  if (status === 'unsupported') return 'Not supported by this browser';
  if (status === 'setup') return 'Temporarily unavailable';
  return 'Checking this device…';
}

function blockedGuidance() {
  if (isMac()) return 'Alerts are blocked. Allow Relay in the browser site controls, then check System Settings → Notifications for Chrome or Safari and reload.';
  return 'Alerts are blocked. Allow Relay in this browser’s site settings, then reload.';
}

async function persist(subscription: PushSubscription) {
  const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) return false;
  const result = await savePushSubscription({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    deviceName: deviceName(),
  });
  return result.ok;
}

function deviceName() {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  if (/CrOS/i.test(ua)) return `Chromebook · ${browser}`;
  if (/iPhone/i.test(ua)) return `iPhone · ${browser}`;
  if (/iPad/i.test(ua)) return `iPad · ${browser}`;
  if (/Android/i.test(ua)) return `Android · ${browser}`;
  if (isMac()) return `Mac · ${browser}`;
  if (/Windows/i.test(ua)) return `Windows · ${browser}`;
  return `Device · ${browser}`;
}

function isIos() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMac() {
  return /Macintosh|Mac OS X/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function formatDeviceDate(iso: string) {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(undefined, sameDay ? { hour: 'numeric', minute: '2-digit' } : { month: 'short', day: 'numeric' }).format(date);
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
