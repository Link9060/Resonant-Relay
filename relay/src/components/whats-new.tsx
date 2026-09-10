'use client';

import { APP_VERSION, DEVELOPMENT_VERSION, IS_BETA } from '@/lib/config';
import { Check, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export const OPEN_WHATS_NEW_EVENT = 'relay-open-whats-new';

const SEEN_VERSION_KEY = 'relay-whats-new-seen-version';

const DEVELOPMENT_RELEASE = {
  version: '1.0.3',
  status: 'Development',
  publishedAt: '2026-09-10T10:30:00-05:00',
  title: 'The next Relay update',
  summary: 'Relay 1.0.3 is the active development build. New improvements will appear here as they are added and tested before the next public release.',
  groups: [
    {
      label: 'In development',
      items: [
        'Ongoing stability, polish, and fixes following the 1.0.2 public release.',
        'New changes stay in the development channel until they are ready for everyone.',
      ],
    },
  ],
} as const;

const PUBLIC_RELEASES = [
  {
    version: '1.0.2',
    status: 'Public release',
    publishedAt: '2026-09-10T10:00:00-05:00',
    title: 'A clearer Relay update',
    summary: 'Update history is now built into Relay, returning users get a quick one-time update brief, and notification setup is easier to understand.',
    groups: [
      {
        label: 'New',
        items: [
          'What’s New now keeps Relay updates in one easy-to-find place.',
          'Returning users get a one-time summary after Relay updates.',
        ],
      },
      {
        label: 'Improved',
        items: [
          'Notification setup now reminds you to allow your browser in your device notification settings.',
          'Release information uses simple wording instead of developer-style changelog language.',
        ],
      },
    ],
  },
  {
    version: '1.0.1',
    status: 'Release candidate',
    publishedAt: '2026-09-10T09:00:00-05:00',
    title: 'Public-release preparation',
    summary: 'Relay 1.0.1 served as the notification and stability checkpoint leading into the 1.0.2 public release.',
    groups: [
      {
        label: 'Release focus',
        items: [
          'Reliable device notifications for messages and requests.',
          'Core messaging, planning, account, and navigation stability.',
          'Final polish before opening Relay beyond the beta group.',
        ],
      },
    ],
  },
  {
    version: '1.0.0',
    status: 'Earlier build',
    publishedAt: '2026-09-01T00:00:00-05:00',
    title: 'Relay beta foundation',
    summary: 'The early Relay build established messaging, planning, connected services, profiles, and the core interface.',
    groups: [
      {
        label: 'Included',
        items: [
          'Messaging, contacts, planner, to-do, calendar, and email views.',
          'Profiles, account controls, staff tools, and the Relay dashboard.',
        ],
      },
    ],
  },
] as const;

const RELEASES = IS_BETA ? [DEVELOPMENT_RELEASE, ...PUBLIC_RELEASES] : [...PUBLIC_RELEASES];

type WhatsNewProps = {
  onboardingCompletedAt?: string | null;
};

export function WhatsNew({ onboardingCompletedAt }: WhatsNewProps) {
  const [open, setOpen] = useState(false);
  const currentVersion = IS_BETA ? DEVELOPMENT_VERSION : APP_VERSION;
  const currentRelease = RELEASES.find((release) => release.version === currentVersion) ?? PUBLIC_RELEASES[0];

  useEffect(() => {
    const openFromDock = () => setOpen(true);
    window.addEventListener(OPEN_WHATS_NEW_EVENT, openFromDock);
    return () => window.removeEventListener(OPEN_WHATS_NEW_EVENT, openFromDock);
  }, []);

  useEffect(() => {
    try {
      const seenVersion = window.localStorage.getItem(SEEN_VERSION_KEY);
      if (seenVersion === APP_VERSION) return;

      const completedAt = onboardingCompletedAt ? new Date(onboardingCompletedAt).getTime() : Number.NaN;
      const releasedAt = new Date(currentRelease.publishedAt).getTime();
      const isReturningUser = Number.isFinite(completedAt) && completedAt < releasedAt;

      if (isReturningUser) {
        setOpen(true);
      } else {
        window.localStorage.setItem(SEEN_VERSION_KEY, APP_VERSION);
      }
    } catch {
      // Local storage can be unavailable in strict/private browser contexts.
    }
  }, [currentRelease.publishedAt, onboardingCompletedAt]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      try {
        window.localStorage.setItem(SEEN_VERSION_KEY, APP_VERSION);
      } catch {
        // The modal can still close even when local storage is unavailable.
      }
      setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  function close() {
    try {
      window.localStorage.setItem(SEEN_VERSION_KEY, APP_VERSION);
    } catch {
      // The modal can still close even when local storage is unavailable.
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="relay-whats-new-title">
      <button type="button" aria-label="Close What’s New" onClick={close} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />

      <section className="relative z-10 flex max-h-[min(42rem,calc(100vh-3rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-2xl">
        <div className="border-b border-border px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-canvas px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                  <Sparkles size={12} /> What’s New
                </span>
                <span className="text-xs text-ink-faint">Relay {currentRelease.version} · {currentRelease.status}</span>
              </div>
              <h2 id="relay-whats-new-title" className="mt-4 font-display text-2xl font-medium tracking-tight text-ink">{currentRelease.title}</h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-ink-muted">{currentRelease.summary}</p>
            </div>
            <button type="button" onClick={close} aria-label="Close" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-surface hover:text-ink">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <div className="space-y-5">
            {currentRelease.groups.map((group) => (
              <section key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">{group.label}</p>
                <div className="mt-2 space-y-2">
                  {group.items.map((item) => (
                    <div key={item} className="flex items-start gap-2.5 text-sm leading-5 text-ink-muted">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-canvas text-ink-faint"><Check size={11} /></span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-7 border-t border-border pt-5">
            <p className="text-xs font-medium text-ink">Update history</p>
            <div className="mt-3 space-y-2">
              {RELEASES.map((release) => (
                <details key={release.version} open={release.version === currentVersion} className="group rounded-xl border border-border bg-canvas">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
                    <div>
                      <div className="text-sm font-medium text-ink">Relay {release.version}</div>
                      <div className="mt-0.5 text-[11px] text-ink-faint">{release.status}</div>
                    </div>
                    <span className="text-xs text-ink-faint transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-xs leading-5 text-ink-muted">{release.summary}</p>
                    <div className="mt-3 space-y-3">
                      {release.groups.map((group) => (
                        <div key={group.label}>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{group.label}</p>
                          <ul className="mt-1.5 space-y-1.5 text-xs leading-5 text-ink-muted">
                            {group.items.map((item) => <li key={item}>• {item}</li>)}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-surface px-5 py-4 sm:px-6">
          <button type="button" onClick={close} className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90">Got it</button>
        </div>
      </section>
    </div>
  );
}
