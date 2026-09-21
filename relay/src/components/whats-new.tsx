'use client';

import { APP_VERSION, DEVELOPMENT_VERSION, IS_BETA } from '@/lib/config';
import { Check, Sparkles, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export const OPEN_WHATS_NEW_EVENT = 'relay-open-whats-new';

const SEEN_VERSION_KEY = 'relay-whats-new-seen-version';

const DEVELOPMENT_RELEASE = {
  version: '1.0.8',
  status: 'Beta · Development',
  publishedAt: '2026-09-21T03:00:00Z',
  title: 'The next Relay beta',
  summary: 'Beta 1.0.8 starts from the complete 1.0.7 Focus Update. New development work will appear here as it lands.',
  groups: [
    {
      label: 'Starting point',
      items: [
        'The Focus workspace, cleaned-up Calendar and Chats layouts, responsive no-scroll dashboard widgets, calendar-only connected accounts, and launch polish all carry forward from 1.0.7.',
        'Beta-only labels stay visible on the development channel so it is always clear when you are testing the next Relay build.',
      ],
    },
  ],
} as const;

const PUBLIC_RELEASES = [
  {
    version: '1.0.7',
    status: 'Public release · Focus Update',
    publishedAt: '2026-09-21T03:00:00Z',
    title: 'Focus Update',
    summary: 'Relay 1.0.7 sharpens the daily workflow with Focus, cleaner communication and calendar layouts, safer connected-account handling, and a more adaptive dashboard.',
    groups: [
      {
        label: 'Focus and dashboard',
        items: [
          'Focus adds a dedicated workspace for timed work sessions and quick access to the parts of Relay that matter while you are working.',
          'Dashboard widgets now change their internal layout for each selected size instead of relying on internal scrollbars.',
          'Compact, skinny, tall, wide, and large widget sizes preserve the useful controls and information that fit each shape.',
        ],
      },
      {
        label: 'Calendar, chats, and navigation',
        items: [
          'Calendar desktop spacing was tightened so all seven days remain visible without squeezing the main grid.',
          'Chats use the available desktop width more effectively, Contacts sits beside Chats in navigation, and the dashboard is denser and easier to scan.',
          'Mailbox access was removed from Relay while Calendar connections remain available through calendar-only permissions.',
        ],
      },
      {
        label: 'Launch polish',
        items: [
          'Owner account inspection now uses the renamed Calendar integration data without exposing raw database errors in the interface.',
          'The Relay mark now uses the same high-quality silver vector shading as the app icon.',
          'Emergency Mode is no longer exposed on the public release and remains available only on the Beta channel.',
        ],
      },
    ],
  },
  {
    version: '1.0.6',
    status: 'Public release · Planning Update',
    publishedAt: '2026-09-14T01:30:00Z',
    title: 'Planning Update',
    summary: 'Relay 1.0.6 turns planning into a daily workflow with a real Schedule timeline, stronger Planner editing, and a more reliable dashboard experience.',
    groups: [
      {
        label: 'Schedule',
        items: [
          'Schedule adds a vertical daily timeline with week navigation, a live NOW line, and a clear view of the day on desktop and mobile.',
          'Timed Google, Microsoft, and Relay Planner events appear as fixed commitments while personal blocks and scheduled To-Dos stay flexible.',
          'Give To-Dos an estimated duration, keep unfinished work in the Unscheduled tray, then drag tasks onto the timeline or use Next spot to find an open block.',
          'Create personal Focus, Break, Routine, or Personal blocks and move flexible blocks as the day changes.',
        ],
      },
      {
        label: 'Planner',
        items: [
          'Plan creators can edit the plan name, notes, repeat pattern, weekdays, date range, and start/end times after creating it.',
          'Custom-date plans use a compact month calendar where individual day boxes can be selected or removed with a click.',
          'Editing preserves past occurrences and responses on unchanged future dates while only changing the future dates the creator actually edits.',
        ],
      },
      {
        label: 'Dashboard and polish',
        items: [
          'Dashboard timing widgets now share live upcoming-event logic so Next Up, Today, School Schedule, and Countdowns stop showing timed events after they begin.',
          'Dashboard Studio uses independent desktop scroll panes for the live preview and customization inspector, with its controls kept in reach.',
          'Focus, Assignments, Weather, sunrise/sunset, and other non-RAVIN widgets received a functionality and stale-data audit; unsupported placeholder widgets were removed for now.',
          'Sign-in now clearly asks for a personal account and warns against school-administered, work-managed, or other administrator-controlled email accounts.',
        ],
      },
    ],
  },
  {
    version: '1.0.5',
    status: 'Public release',
    publishedAt: '2026-09-13T20:35:00Z',
    title: 'Your Relay, your layout',
    summary: 'Relay 1.0.5 turns the dashboard into a real workspace, expands planning and Calendar intelligence, and gives desktop Relay more control without making mobile more complicated.',
    groups: [
      {
        label: 'Dashboard Studio',
        items: [
          'Customize the dashboard in a dedicated full-screen Studio with a persistent live preview.',
          'Drag widgets to reorder them, drag hidden widgets onto the canvas, and resize width or height on a 12-column snap grid.',
          'Use built-in layouts or save your own reusable dashboard presets, including widget visibility, order, width, and height.',
          'The expanded widget library includes Weather, Quick Note, Focus, Assignments, Day Progress, School Schedule, RAVIN previews, and more.',
        ],
      },
      {
        label: 'Planning and Calendar',
        items: [
          'Planner items can use real start and end times, and recurring plans present upcoming occurrences without cluttering the active view with past dates.',
          'Planner creation, schedule summaries, occurrence selection, and overview cards are clearer and faster to scan.',
          'Connected Google Calendar can discover subscribed and shared calendars, and all-day events stay truly all-day.',
        ],
      },
      {
        label: 'Desktop and Still',
        items: [
          'Desktop Relay supports Classic, Focus Rail, Topbar, and Floating Dock layouts while mobile keeps its stable navigation model.',
          'Still has been rebuilt as a quiet structured experience with visible navigation, restrained motion, subtle hierarchy, and sparse accent signals.',
          'Still keyboard shortcuts are scoped to Still itself, and its experience controls are easier to discover and exit.',
        ],
      },
    ],
  },
  {
    version: '1.0.4',
    status: 'Public release',
    publishedAt: '2026-09-13T11:45:00-05:00',
    title: 'Make Relay yours',
    summary: 'Relay 1.0.4 brings the full Relay Experience system to public, expands color choices, improves particle continuity, and adds Emergency Mode as a resilient fallback.',
    groups: [
      {
        label: 'New',
        items: [
          'Relay Experience lets you switch between Flow, Still, Nexus, Aura, Slate, Spark, Lucid, and Vivid.',
          'A much larger color palette includes additional single colors and two-color combinations.',
          'Vivid uses the selected primary color across panels, controls, borders, and particles in multiple shades.',
          'Emergency Mode provides a lightweight fallback for essential Relay access if the main interface has trouble loading.',
        ],
      },
      {
        label: 'Improved',
        items: [
          'Landing, loading, and transition particles now keep your selected palette instead of snapping back to white.',
          'Lucid keeps its glass depth without distorting panel geometry or clipping popovers.',
          'Still and Slate keep controls readable on hover, and Slate adds the mouse-following sidebar accent rail.',
          'The Experience picker is better organized and stays usable as the number of modes and palettes grows.',
        ],
      },
    ],
  },
  {
    version: '1.0.3',
    status: 'Public release',
    publishedAt: '2026-09-10T10:30:00-05:00',
    title: 'Notes arrive in Relay',
    summary: 'Relay 1.0.3 added a dedicated private Notes workspace and clearer staff identities.',
    groups: [
      {
        label: 'New',
        items: [
          'Notes have their own tab and sync privately with your Relay account.',
          'Build notes from text, headings, lists, checkboxes, and quotes, with automatic saving, search, pinning, and block reordering.',
          'Owner, Admin, and Moderator titles appear beside people across profiles, contacts, and chats.',
        ],
      },
      {
        label: 'Foundation',
        items: [
          'Notes use structured blocks and stable IDs so a future visual knowledge graph can connect notes, tasks, and files for RAVIN.',
        ],
      },
    ],
  },
  {
    version: '1.0.2',
    status: 'Public release',
    publishedAt: '2026-09-10T10:00:00-05:00',
    title: 'A clearer Relay update',
    summary: 'Update history is built into Relay, returning users get a quick one-time update brief, and notification setup is easier to understand.',
    groups: [
      {
        label: 'New',
        items: [
          'What’s New keeps Relay updates in one easy-to-find place.',
          'Returning users get a one-time summary after Relay updates.',
        ],
      },
      {
        label: 'Improved',
        items: [
          'Notification setup reminds you to allow your browser in your device notification settings.',
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
