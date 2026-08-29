# Relay — Foundation + Social Core Scaffold

Authentication, profiles, Relay Numbers, contacts, direct messages, and
groups are real and working. Planner, Calendar, Email, and Obsidian are
stubbed as honest placeholders — no fake buttons pretending they work.

## What's actually built

### Foundation
- **Continue with Google** sign-in (Supabase Auth, identity scopes only)
- A **profile** created automatically on first sign-in, with a randomly
  generated **7-digit Relay Number** (collision-checked, not sequential)
- **Add Person**: look someone up by Relay Number, preview their name/school,
  send a connection request
- **Connection requests**: accept / decline / cancel, with request state
  modeled explicitly (not just a boolean "friends" flag)
- **Contacts list** of accepted connections
- A rate-limited, exact-match-only RPC for Relay Number lookups, so the
  contact graph can't be scraped by guessing numbers

### Social Core
- **Direct messages** — restricted to people in your contacts, one thread per
  pair (enforced at the DB level via a canonical `direct_key`, not app logic)
- **Groups** — reusable, created from a multi-select of your contacts; every
  group gets its own chat automatically
- **Live messaging** via Supabase Realtime — new messages appear without a
  refresh, scoped per-conversation
- **Leave group** — removes you from the roster and its chat; the group is
  cleaned up automatically once everyone's left

### Cross-cutting
- Row Level Security on every table — authorization is enforced by Postgres,
  not by what the frontend chooses to render
- Dark/light mode toggle (black + white identity, no-flash on load)
- Responsive dock: left rail on desktop, bottom tab bar on mobile

### Planner (the differentiator)
- **Recurring plans** — never / daily / weekly / custom dates, generated as
  real per-occurrence rows up front (an open-ended weekly plan seeds its next
  8 occurrences; a bounded one generates through its end date, capped at 26)
- **Two response types**: choose-an-option (Seminar, lunch votes, polls) and
  yes/no/maybe RSVP (scrimmages, rides) — deliberately not more than that for
  the MVP; availability-matching and free-text responses are future scope
- **The Seminar table**: every group member's response per occurrence, with
  "Not decided" shown explicitly rather than left blank
- **Summaries that read like a person wrote them** — "You, Jack, and Owen are
  together" when you share an answer with others, falling back to "3 people
  are going to Mr. Smith" when you haven't responded yet
- Plans always belong to a Group — no separate participant-picker, since
  Groups (Social Core) already solve "select these six people" reuse
- Delete restricted to the plan's creator or a group admin

### Student Hub
- **Calendar**: read-only Google Calendar events, requested with the
  narrowest applicable scope (`calendar.events.readonly`, not the broader
  `calendar` or `calendar.readonly`), shown alongside upcoming Relay Plan
  occurrences — Calendar answers "what's happening," Planner answers "what
  are we doing about it," per the product spec's own distinction
- **Email**: read-only Gmail inbox (subject/from/snippet), requested with
  `gmail.readonly`. Compose/reply are explicitly out of scope for now —
  adding them later means asking for `gmail.send` incrementally, at the
  moment a student actually taps compose, not bundled into this connection
- **Incremental Google OAuth**, done for real: sign-in only ever requests
  `openid email profile`. Calendar/Gmail scopes are requested only when the
  student taps "Connect," using a second `signInWithOAuth` call with
  `access_type: offline, prompt: consent` so Google returns a refresh token
  (confirmed against Google's and Supabase's current docs — Supabase does
  not persist provider tokens itself, so Relay captures and stores them in
  its own table)
- **Tokens never reach RLS, let alone the browser**: `google_integrations`
  has RLS enabled with zero policies defined, so the `anon`/`authenticated`
  roles are denied every operation by default — not even the owning user can
  read their own refresh token through the normal client. Only the
  service-role key can touch that table, and it's used exclusively inside
  `src/lib/google/*`, modules marked `server-only` so importing them into a
  Client Component fails the build rather than silently shipping a secret
- **Disconnect** revokes the token with Google's own revoke endpoint (best
  effort) in addition to deleting Relay's copy

### Notifications
- **In-app feed**: a bell in the header with a realtime-updating dropdown,
  backed by a `notifications` table locked down the same way
  `google_integrations` is — RLS enabled with no client-facing INSERT
  policy, because this is the app writing to someone else's feed ("you got a
  request"), which per-user RLS can't express safely. All writes go through
  `src/lib/notifications/*` using the service-role client.
- **Real OS-level push**: a service worker (`public/sw.js`) plus the Web
  Push API, so a notification shows up in the actual OS notification center
  (macOS Notification Center, Windows Action Center, etc.) even when Relay
  isn't the focused tab — not just an in-app badge. Toggle it on from
  Profile. Subscriptions live in `push_subscriptions`, one row per
  browser/device, managed directly by their owner (RLS owner-scoped — safe
  to do without a service-role indirection here, since a subscription is
  just "deliver my pushes to this browser I'm using right now").
- **Wired into every real event**: connection request sent/accepted, added
  to a group, new message, new plan created. Deliberately *not* wired into
  every plan response (spec explicitly warns against notification spam) —
  the Planner page's live summary line covers that instead.
- **The one time-based notification** — "Seminar is tomorrow, you haven't
  responded" — needs a scheduler, since nothing in the app "causes" it the
  way sending a message does. `/api/cron/plan-reminders` + `vercel.json`
  handle this, secured with `CRON_SECRET` (Vercel automatically sends it as
  a Bearer token on scheduled invocations — this only actually fires once
  deployed to Vercel; nothing triggers it in local dev).

### UI pass
- Dialogs now actually use the `tailwindcss-animate` utilities that were a
  dependency from the start but never wired up — real fade/zoom transitions
  instead of an instant pop
- A shared `PageHeader` component standardizes the title/subtitle/action row
  across Contacts, Chats, Planner, Calendar, and Email
- `loading.tsx` skeletons for every main route and the two detail views
  (conversation thread, plan detail), so navigation has something better
  than a blank flash while Server Components fetch
- Subtle press feedback (`active:scale-[0.97]`) on primary buttons

## What's NOT built yet (on purpose)

Obsidian is a placeholder page only. It needs its own research phase before
implementation — see the note below.

## Known limitation to revisit

`leave_group` doesn't currently prevent a group from ending up with zero
admins if the sole admin leaves while other members remain. Fine for an MVP
among a friend group, but worth fixing (e.g. auto-promote the
longest-standing member) before this goes to a wider audience.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **Authentication → Providers**, enable **Google** and fill in the
   Client ID/Secret from a Google Cloud OAuth 2.0 Web application (see
   below). Set the redirect URL Supabase gives you in the Google Cloud
   Console's "Authorized redirect URIs".
3. In the **SQL Editor**, run the files in `supabase/migrations/` **in
   order** (`0001_foundation.sql`, `0002_social_core.sql`,
   `0003_planner.sql`, `0004_student_hub.sql`, `0005_notifications.sql`),
   each once.
4. Copy your project's **URL** and **anon public key** from
   **Project Settings → API**.
5. Confirm Realtime is on for the `messages` table: **Database → Replication**
   should show `messages` under the `supabase_realtime` publication (the
   migration adds it automatically, but it's worth a glance).

### 2. Google Cloud OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com), create an
   OAuth 2.0 Client ID (Web application).
2. Authorized redirect URI: the callback URL Supabase shows you on the
   Google provider settings page (looks like
   `https://<project-ref>.supabase.co/auth/v1/callback`).
3. Only request `openid email profile` at this stage — Calendar/Gmail
   scopes come later, requested only when a student connects those features,
   per the product spec's incremental-consent requirement.
4. In the same Cloud project, enable the **Google Calendar API** and the
   **Gmail API** (APIs & Services → Library) — Calendar/Email won't work
   without these turned on, separately from the OAuth client itself.
5. Copy the **Client ID** and **Client secret** into both Supabase's Google
   provider settings *and* your own `.env.local` as `GOOGLE_OAUTH_CLIENT_ID`
   / `GOOGLE_OAUTH_CLIENT_SECRET` — they have to be the same client, because
   the refresh token Relay stores was issued to it and can only be redeemed
   by it.

### 3. Web Push (for real OS-level notifications)

1. Generate a VAPID key pair once: `npx web-push generate-vapid-keys`.
2. Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the private key
   in `VAPID_PRIVATE_KEY` in `.env.local`. Set `VAPID_SUBJECT` to a
   `mailto:` address or your site URL (required by the Web Push spec so
   push services can contact you about your app if needed).
3. Add an icon at `public/icon.png` — the service worker references it for
   the notification icon/badge; without one, notifications still work but
   fall back to the browser's default icon.
4. Set a random `CRON_SECRET` (16+ characters) if you plan to deploy the
   daily plan-reminder job — see "Known limitations" below.

### 4. Local environment

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/login`.

## Notes on the Relay Number format

Stored as 7 raw digits, displayed as `123-4567`. The spec explicitly says not
to lock in a permanent format — the DB stores it as `text` with a check
constraint (not a fixed-width integer type) specifically so the format can
evolve later (e.g. adding letters, a checksum digit, or a different length)
without a migration that breaks existing numbers.

## Known limitations to revisit

- `leave_group` doesn't guarantee a group keeps at least one admin.
- Plan options are fixed at creation — there's no "suggest another option"
  flow yet, which the product spec's polling vision (§14) would eventually
  want (e.g. someone proposing "Freddy's" after the vote's already open).
- Planner's recurrence generation is a one-time batch at creation, not a
  background job — an open-ended weekly plan won't grow past its initial 8
  occurrences until a "generate more" action or scheduled job is added.
- Gmail inbox loading does one API call per message to get subject/from
  (`messages.list` then `messages.get` per result) rather than a batched
  request — fine for a page of 15 messages, worth revisiting if that grows.
- The initial Google access token's expiry is estimated (55 minutes) rather
  than read from the OAuth response, since Supabase's session object doesn't
  surface it. Harmless — worst case is one avoidable refresh call — but
  worth tightening if Relay starts making many Calendar/Gmail calls per load.
- Web Push requires a secure context — `localhost` is exempted for local
  dev, but a real deployment needs HTTPS (which Vercel gives you by
  default). There's no `public/icon.png` included in this scaffold; add one
  or notifications will just use the browser's default icon.
- The plan-reminder cron is the one piece of this scaffold that does nothing
  until deployed — there's no local scheduler standing in for Vercel Cron,
  so "Seminar is tomorrow" reminders won't fire in `npm run dev`.

## Next steps (Second Brain phase — deferred)

Obsidian has no official cloud API or OAuth system, and neither of the two
"official-ish" paths fits Relay:

- **Local REST API** (community plugin): an HTTP server on
  `127.0.0.1:27124`, but only while the Obsidian desktop app is open, on
  that one machine. Doesn't work from a phone or a different computer —
  incompatible with Relay's mobile-first requirement.
- **Obsidian Sync** (Obsidian's own paid service): proprietary, no
  third-party read API at all.

The one real opening: community plugins sync vaults to generic cloud
storage (Google Drive, Dropbox, S3, WebDAV) the student already has. Since
Relay already has working Google OAuth infrastructure, the realistic MVP
path would be reading a Drive folder the student's vault syncs to (via
Drive Picker + the `drive.file` scope, so Relay only ever sees the folder
they explicitly select — not their whole Drive), rather than inventing an
Obsidian-specific connector.

The catch, and the reason this is deferred rather than built: it only works
for students who already sync their vault to Drive. "Connect Obsidian
Second Brain" can't be the universal one-tap thing the product vision
describes — it's really "connect the Drive folder your vault syncs to,"
which is a narrower promise. Worth another look once there's appetite to
either accept that narrower scope or find a better answer.
