'use client';

import { markAllNotificationsRead, markNotificationRead } from '@/lib/actions/notifications';
import { createClient } from '@/lib/supabase/client';
import type { Notification } from '@/lib/types/database';
import { Bell, ChevronDown } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { appPageUrl, normalizeAppLink } from '@/lib/config';

export function NotificationBell({ currentUserId, initial }: { currentUserId: string; initial: Notification[] }) {
  const [notifications, setNotifications] = useState(initial);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` }, (payload) => {
        const incoming = payload.new as Notification;
        if (!incoming?.id) return;
        setNotifications((prev) => {
          const exists = prev.some((notification) => notification.id === incoming.id);
          return exists ? prev.map((notification) => notification.id === incoming.id ? incoming : notification) : [incoming, ...prev].slice(0, 20);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const groups = useMemo(() => groupNotifications(notifications), [notifications]);

  async function handleSelect(notification: Notification) {
    if (!notification.read_at) {
      setNotifications((prev) => prev.map((n) => n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n));
      await markNotificationRead(notification.id);
    }
    setOpen(false);
    if (notification.link) window.location.assign(appPageUrl(normalizeAppLink(notification.link)));
  }

  async function handleMarkAllRead() {
    const timestamp = new Date().toISOString();
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? timestamp })));
    await markAllNotificationsRead();
  }

  return (
    <div className="relative">
      <button type="button" aria-label="Notifications" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((current) => !current)} className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink">
        <Bell size={18} />
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent" aria-hidden="true" />}
      </button>
      {open && (
        <>
          <button type="button" aria-label="Close notifications" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Notifications" className="fixed left-4 right-4 top-16 z-40 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-xl md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-96">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <div><p className="text-sm font-medium text-ink">Notifications</p><p className="text-[11px] text-ink-faint">Grouped so nothing gets lost</p></div>
              {unreadCount > 0 && <button onClick={handleMarkAllRead} className="text-xs text-ink-faint hover:text-ink">Mark all read</button>}
            </div>
            {notifications.length === 0 ? <p className="px-3 py-8 text-center text-sm text-ink-faint">Nothing yet.</p> : <div className="max-h-[min(28rem,70vh)] overflow-y-auto p-1.5">{groups.map((group) => <NotificationGroup key={group.label} group={group} onSelect={handleSelect} />)}</div>}
          </div>
        </>
      )}
    </div>
  );
}

type NotificationGroupData = { label: string; items: Notification[] };

function groupNotifications(notifications: Notification[]): NotificationGroupData[] {
  const grouped = new Map<string, Notification[]>();
  for (const notification of notifications) {
    const label = notification.type === 'group_added' || notification.type === 'plan_created' || notification.type === 'plan_reminder' || notification.link?.startsWith('/chats/') ? 'Group chats & plans' : notification.type === 'new_message' ? 'Messages' : 'Connections';
    grouped.set(label, [...(grouped.get(label) ?? []), notification]);
  }
  return Array.from(grouped, ([label, items]) => ({ label, items }));
}

function NotificationGroup({ group, onSelect }: { group: NotificationGroupData; onSelect: (notification: Notification) => void }) {
  return <section className="mb-2 last:mb-0"><div className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint"><ChevronDown size={12} />{group.label}<span className="ml-auto font-normal">{group.items.length}</span></div>{group.items.map((notification) => <button type="button" key={notification.id} onClick={() => void onSelect(notification)} className="w-full rounded-md px-2 py-2 text-left outline-none hover:bg-surface focus-visible:bg-surface"><div className="flex items-start gap-2">{!notification.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}<div className={notification.read_at ? 'pl-3.5' : ''}><p className="text-sm text-ink">{notification.title}</p><p className="mt-0.5 line-clamp-2 text-xs text-ink-faint">{notification.body}</p><p className="mt-1 text-[11px] text-ink-faint">{relativeTime(notification.created_at)}</p></div></div></button>)}</section>;
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
