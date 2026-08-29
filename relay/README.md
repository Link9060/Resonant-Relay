# Relay — Foundation Phase Scaffold

This is the first slice of Relay: authentication, profiles, Relay Numbers, and
contacts/connection requests. Chats, Planner, Calendar, Email, and Obsidian
are stubbed as honest placeholders — no fake buttons pretending they work.

## What's actually built

- **Continue with Google** sign-in (Supabase Auth, identity scopes only)
- A **profile** created automatically on first sign-in, with a randomly
  generated **7-digit Relay Number** (collision-checked, not sequential)
- **Add Person**: look someone up by Relay Number, preview their name/school,
  send a connection request
- **Connection requests**: accept / decline / cancel, with request state
  modeled explicitly (not just a boolean "friends" flag)
- **Contacts list** of accepted connections
- Row Level Security on every table — authorization is enforced by Postgres,
  not by what the frontend chooses to render
- A rate-limited, exact-match-only RPC for Relay Number lookups, so the
  contact graph can't be scraped by guessing numbers
- Dark/light mode toggle (black + white identity, no-flash on load)
- Responsive dock: left rail on desktop, bottom tab bar on mobile

## What's NOT built yet (on purpose)

Chats, Planner, Calendar, Email, and Obsidian are placeholder pages only.
Per the product spec, Foundation comes first — these get built once the
account/contacts layer is solid.

## Setup

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **Authentication → Providers**, enable **Google** and fill in the
   Client ID/Secret from a Google Cloud OAuth 2.0 Web application (see
   below). Set the redirect URL Supabase gives you in the Google Cloud
   Console's "Authorized redirect URIs".
3. In the **SQL Editor**, run the contents of `supabase/schema.sql` once.
4. Copy your project's **URL** and **anon public key** from
   **Project Settings → API**.

### 2. Google Cloud OAuth client

1. In [Google Cloud Console](https://console.cloud.google.com), create an
   OAuth 2.0 Client ID (Web application).
2. Authorized redirect URI: the callback URL Supabase shows you on the
   Google provider settings page (looks like
   `https://<project-ref>.supabase.co/auth/v1/callback`).
3. Only request `openid email profile` at this stage — Calendar/Gmail
   scopes come later, requested only when a student connects those features,
   per the product spec's incremental-consent requirement.

### 3. Local environment

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

## Next steps (Social Core phase)

- Direct messages + group chats (Supabase Realtime is a natural fit)
- Groups as a reusable entity referenced by both Chats and the upcoming
  Planner
