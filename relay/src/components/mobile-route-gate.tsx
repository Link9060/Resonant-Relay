'use client';

import { appPageUrl, appPathname } from '@/lib/config';
import type { AppRole } from '@/lib/role-preview';
import { ArrowLeft, Laptop, LayoutDashboard } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

const DESKTOP_FIRST: Array<{
  path: string;
  title: string;
  body: string;
  dashboard?: boolean;
}> = [
  { path: '/email', title: 'Full Mail is on Relay for Mac', body: 'Recent and important mail stays available from your Dashboard while you are on the move.', dashboard: true },
  { path: '/calendar', title: 'Full Calendar is on Relay for Mac', body: 'Your next events stay visible from Dashboard. Use Relay on a larger screen for full calendar management.', dashboard: true },
  { path: '/planner', title: 'Advanced Planner is on Relay for Mac', body: 'Upcoming plans stay visible from Dashboard. Creating and managing complex plans is intentionally desktop-first.', dashboard: true },
  { path: '/todo', title: 'Weekly task management is on Relay for Mac', body: 'You can still see, add, and complete today’s tasks directly from Dashboard.', dashboard: true },
  { path: '/quicklinks', title: 'Quick Links are on Relay for Mac', body: 'Your saved desktop shortcuts stay on the Mac where you created them.', dashboard: true },
  { path: '/admin/users', title: 'Full account inspection is on Relay for Mac', body: 'On iPhone, use Reports for urgent moderation. Deep user graphs, storage, sessions, and Owner controls are designed for a larger screen.' },
  { path: '/admin/analytics', title: 'Owner Analytics is on Relay for Mac', body: 'Detailed Relay analytics are intentionally desktop-first so the data stays readable and useful.' },
  { path: '/admin/system', title: 'System controls are on Relay for Mac', body: 'System health, storage analysis, and operational diagnostics are intentionally desktop-first.' },
  { path: '/admin/activity', title: 'Full audit history is on Relay for Mac', body: 'Sensitive staff actions are still recorded. Use Relay on a larger screen to inspect the complete audit timeline.' },
];

function subscribeMobile(callback: () => void) {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

function getMobileSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function MobileRouteGate({ children, role }: { children: React.ReactNode; role: AppRole }) {
  const pathname = usePathname();
  const path = appPathname(pathname);
  const mobile = useSyncExternalStore(subscribeMobile, getMobileSnapshot, getServerSnapshot);

  if (!mobile) return children;

  const blocked = DESKTOP_FIRST.find((item) => path === item.path || path.startsWith(`${item.path}/`));
  if (!blocked) return children;

  const reportsHref = role === 'user' ? null : appPageUrl('/admin/moderation');

  return (
    <div className="mx-auto flex min-h-[62dvh] max-w-md items-center px-5 py-8">
      <section className="w-full rounded-3xl border border-border bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-canvas text-ink-muted">
          <Laptop size={21} />
        </div>
        <div className="mt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-faint">Relay Mobile · Full on Mac</div>
        <h1 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink">{blocked.title}</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-ink-muted">{blocked.body}</p>

        <div className="mt-6 grid gap-2">
          {blocked.dashboard && (
            <a href={appPageUrl('/')} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-medium text-canvas">
              <LayoutDashboard size={16} />Open Dashboard quick view
            </a>
          )}
          {!blocked.dashboard && reportsHref && (
            <a href={reportsHref} className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-4 text-sm font-medium text-canvas">Review reports</a>
          )}
          <button type="button" onClick={() => window.history.back()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-medium text-ink">
            <ArrowLeft size={16} />Go back
          </button>
        </div>
      </section>
    </div>
  );
}
