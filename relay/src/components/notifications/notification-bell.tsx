'use client';

import { markAllNotificationsRead, markNotificationRead } from '@/lib/actions/notifications';
import { appPageUrl, normalizeAppLink } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/lib/types/database';
import { PushToggle } from '@/components/notifications/push-toggle';
import { Bell, CalendarClock, Check, MessageCircle, Settings2, UserRoundCheck, UserRoundPlus, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export function NotificationBell({ currentUserId, initial }: { currentUserId: string; initial: Notification[] }) {
  const [notifications, setNotifications] = useState(initial);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const removed = payload.old as Pick<Notification, 'id'>;
          if (removed?.id) setNotifications((current) => current.filter((notification) => notification.id !== removed.id));
          return;
        }

        const incoming = payload.new as Notification;
        if (!incoming?.id) return;
        setNotifications((current) => {
          const exists = current.some((notification) => notification.id === incoming.id);
          return exists
            ? current.map((notification) => notification.id === incoming.id ? incoming : notification)
            : [incoming, ...current].slice(0, 20);
        });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [currentUserId]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;
  const sections = useMemo(() => [
    { label: 'New', items: notifications.filter((notification) => !notification.read_at) },
    { label: 'Earlier', items: notifications.filter((notification) => notification.read_at) },
  ].filter((section) => section.items.length > 0), [notifications]);

  async function handleSelect(notification: Notification) {
    if (!notification.read_at) {
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
      await markNotificationRead(notification.id);
    }
    setOpen(false);
    if (notification.link) window.location.assign(appPageUrl(normalizeAppLink(notification.link)));
  }

  async function handleMarkAllRead() {
    const timestamp = new Date().toISOString();
    setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? timestamp })));
    await markAllNotificationsRead();
  }

  return (
    <div className="relative">
      <button type="button" aria-label={unreadCount ? `Notifications, ${unreadCount} new` : 'Notifications'} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((current) => !current)} className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold leading-none text-white ring-2 ring-canvas" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close notifications" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Notifications" className="fixed left-3 right-3 top-16 z-40 flex max-h-[calc(100vh-5rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-2xl md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-[26rem]">
            <div className="flex min-h-14 items-center justify-between gap-4 border-b border-border px-4">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-semibold text-ink">Notifications</h2>
                {unreadCount > 0 && <span className="text-xs text-ink-faint">{unreadCount} new</span>}
              </div>
              {unreadCount > 0 && (
                <button type="button" onClick={() => void handleMarkAllRead()} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-ink-faint transition-colors hover:bg-surface hover:text-ink">
                  <Check size={13} /> Mark all read
                </button>
              )}
            </div>

            <PushToggle variant="compact" />

            <div className="border-b border-border bg-canvas/65 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <Settings2 size={14} className="mt-0.5 shrink-0 text-ink-faint" />
                <p className="text-[11px] leading-4.5 text-ink-faint">
                  <span className="font-medium text-ink-muted">One more step:</span> your device also has to allow notifications for the browser you use. If Relay tests appear here but not on your screen, check your device notification settings and make sure Chrome, Safari, or Edge is allowed. On Mac, go to System Settings → Notifications → your browser.
                </p>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-10 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface text-ink-faint"><Bell size={18} /></span>
                <p className="mt-3 text-sm font-medium text-ink">You&apos;re all caught up</p>
                <p className="mt-1 text-xs text-ink-faint">Messages, requests, and reminders will appear here.</p>
              </div>
            ) : (
              <div className="min-h-0 flex-1 overflow-y-auto py-1">
                {sections.map((section) => (
                  <section key={section.label} aria-label={section.label}>
                    <p className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">{section.label}</p>
                    <div>{section.items.map((notification) => <NotificationRow key={notification.id} notification={notification} onSelect={handleSelect} />)}</div>
                  </section>
                ))}
              </div>
            )}

            <a href={appPageUrl('/profile#notifications')} onClick={() => setOpen(false)} className="flex h-11 items-center justify-center gap-2 border-t border-border text-xs font-medium text-ink-faint transition-colors hover:bg-surface hover:text-ink">
              <Settings2 size={14} /> Notification settings
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationRow({ notification, onSelect }: { notification: Notification; onSelect: (notification: Notification) => void }) {
  return (
    <button type="button" onClick={() => void onSelect(notification)} className={`group flex w-full items-start gap-3 px-4 py-3 text-left outline-none transition-colors hover:bg-surface focus-visible:bg-surface ${notification.read_at ? '' : 'bg-surface/55'}`}>
      <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-canvas text-ink-muted">
        <NotificationTypeIcon notification={notification} />
        {!notification.read_at && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-surface-raised" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className={`truncate text-sm text-ink ${notification.read_at ? 'font-normal' : 'font-medium'}`}>{notification.title}</span>
          <time className="shrink-0 pt-0.5 text-[10px] text-ink-faint" dateTime={notification.created_at}>{relativeTime(notification.created_at)}</time>
        </span>
        <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-ink-faint">{notification.body}</span>
      </span>
    </button>
  );
}

function NotificationTypeIcon({ notification }: { notification: Notification }) {
  if (notification.type === 'new_message') return <MessageCircle size={15} />;
  if (notification.type === 'connection_request') return <UserRoundPlus size={15} />;
  if (notification.type === 'connection_accepted') return <UserRoundCheck size={15} />;
  if (notification.type === 'plan_created' || notification.type === 'plan_reminder') return <CalendarClock size={15} />;
  if (notification.type === 'group_added' || notification.link?.startsWith('/chats/')) return <UsersRound size={15} />;
  return <Bell size={15} />;
}

function relativeTime(iso: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(iso));
}
