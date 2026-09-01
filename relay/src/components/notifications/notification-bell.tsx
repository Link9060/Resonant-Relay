'use client';

import { markAllNotificationsRead, markNotificationRead } from '@/lib/actions/notifications';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/lib/types/database';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { appUrl, normalizeAppLink } from '@/lib/config';

export function NotificationBell({ currentUserId, initial }: { currentUserId: string; initial: Notification[] }) {
  const [notifications, setNotifications] = useState(initial);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleSelect(notification: Notification) {
    if (!notification.read_at) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n)));
      await markNotificationRead(notification.id);
    }
    setOpen(false);
    if (notification.link) window.location.assign(appUrl(normalizeAppLink(notification.link)));
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
      await markAllNotificationsRead();
  }

  return (
    <div className="relative">
        <button
          type="button"
          aria-label="Notifications"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((current) => !current)}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
          )}
        </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Notifications"
            className="fixed left-4 right-4 top-16 z-40 rounded-lg border border-border bg-surface-raised p-1.5 shadow-xl md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80"
          >
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-medium text-ink">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-ink-faint hover:text-ink">
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-ink-faint">Nothing yet.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => void handleSelect(notification)}
                  className="w-full cursor-pointer rounded-md px-2 py-2 text-left outline-none hover:bg-surface focus-visible:bg-surface"
                >
                  <div className="flex items-start gap-2">
                    {!notification.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                    <div className={notification.read_at ? 'pl-3.5' : ''}>
                      <p className="text-sm text-ink">{notification.title}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">{notification.body}</p>
                      <p className="mt-1 text-[11px] text-ink-faint">{relativeTime(notification.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          </div>
        </>
      )}
    </div>
  );
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
