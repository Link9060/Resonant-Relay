# Relay

Relay is a student-focused communication and planning web app built with Next.js, React, TypeScript, Tailwind, and Supabase. The production app is designed for `https://resonantrelay.org`; the GitHub Pages build is used as the separate Beta environment.

## Current product

### Accounts and profiles
- Supabase Auth with Google sign-in and email magic-link / OTP sign-in.
- First-run onboarding, usernames, profile fields, Relay Numbers, discovery privacy controls, and account deletion/export.
- Owner, Admin, Moderator, and User roles with server-enforced permissions.

### Contacts and discovery
- Exact Relay Number adds.
- Name-based Discover search with mutual-contact/shared-group context.
- Connection requests, accepted contacts, contact nicknames/colors, remove-contact, block/unblock, and blocked-people management.
- Direct connection-request mutations are RPC-only; normal clients cannot directly insert/update/delete request rows.

### Messaging and groups
- Direct and group conversations backed by Supabase Realtime.
- Replies, reactions, editing, unsend, pins, read state, typing, attachments, reporting, mute/pin preferences, and group administration.
- Direct-message sending respects connection/block state at the database layer.
- Server-side message burst limits protect against spam.
- Attachment uploads are private, conversation-authorized, limited to 10 MB per file, and capped at 250 MiB per account.
- If the last group admin leaves while members remain, Relay automatically promotes the longest-standing remaining member.

### Planner and tasks
- Personal to-do items.
- Group plans with recurring occurrences, option voting or RSVP responses, summaries, and plan management.
- The Dashboard surfaces mobile-friendly quick views while advanced planning remains desktop-first.

### Mail and Calendar
- Read-only Google and Microsoft inbox/calendar connections through Supabase Edge Functions.
- OAuth state is server-side and records the trusted production/Beta return origin so callbacks return to the environment that started the connection.
- OAuth tokens are stored only in server-only integration tables protected by RLS with no client policies.
- Google/Microsoft production provider verification and consent configuration are operational launch requirements; see the release checklist below.

### Notifications
- In-app notifications and Supabase Realtime updates.
- Web Push through the PWA service worker and the `push-dispatch` Edge Function.
- The service worker derives its base path from its registration scope so the same source works on production `/` and Beta `/Resonant-Relay/`.

### Staff and Owner controls
- Relay Control Center with Requests, Users, Moderation, Analytics, System, and Activity views according to role.
- Report review and moderation workflow.
- Owner deep account inspection, audit history, role controls, ban/unban, force sign-out, account removal, notes, and storage analytics.
- Sensitive Owner actions are logged.

## Security model

Relay treats the browser as untrusted. Important authorization is enforced by Postgres RLS, scoped RPCs, Storage policies, and authenticated Edge Functions rather than relying on hidden UI controls.

Current release hardening includes:
- RPC-only connection-request mutations.
- Server-side contact-search/request/support/message rate limits.
- Private attachment bucket with allowed MIME types, 10 MB object limit, send-permission checks, and per-user storage quota.
- Server-only OAuth integration/state tables.
- Role checks inside staff/Owner `SECURITY DEFINER` RPCs.
- Owner-only read access to the admin audit log and no client write access.
- Production/Beta/local CORS allowlists for Edge Functions.

Supabase's advisor will still flag authenticated-callable `SECURITY DEFINER` functions because Relay intentionally exposes selected RPCs to signed-in users. Those RPCs must continue to validate caller identity/role/ownership internally. Remaining RLS init-plan warnings are performance cleanup, not permission grants.

## Deployment architecture

### Beta
`.github/workflows/deploy-pages.yml`

A push to `beta` builds a static Next.js export with:
- `NEXT_PUBLIC_RELAY_DEPLOY_TARGET=github-pages`
- `NEXT_PUBLIC_SITE_URL=https://link9060.github.io/Resonant-Relay`

The artifact is deployed to GitHub Pages.

### Production
`.github/workflows/production-build.yml`

A push to `main` runs:
1. `npm ci`
2. lint
3. TypeScript checking
4. release safety checks
5. production static export
6. artifact upload

The workflow proves the production bundle is buildable. Actual deployment of that artifact to the service behind `resonantrelay.org` must be configured for the chosen production host.

### Pull requests
`.github/workflows/relay-ci.yml` runs install, lint, typecheck, release checks, and build before changes are merged.

## Supabase

The Relay Supabase project provides:
- Auth
- Postgres + RLS/RPCs
- Realtime
- Storage
- Edge Functions
- Web Push dispatch support

Active application Edge Functions include:
- `google-hub`
- `mail-hub`
- `push-dispatch`
- `account-center`

Database changes are forward-only migrations in `supabase/migrations/`. Never edit a migration after it may have been applied; create a new migration instead.

## Local development

```bash
npm install
npm run dev
```

Important public configuration belongs in `NEXT_PUBLIC_*` variables. Service-role keys, OAuth client secrets, VAPID private keys, and other server credentials must never be shipped to Client Components.

Useful checks:

```bash
npm run lint
npm run typecheck
npm run release-check
npm run build
```

## Public-release checklist

Before opening Relay broadly:
- Confirm `resonantrelay.org` deploys the latest successful production artifact and HTTPS is enforced.
- Confirm Supabase Auth Site URL and redirect allowlist include production and Beta callbacks.
- Confirm Google and Microsoft OAuth callback URIs and production consent configuration.
- Complete any provider verification required for Google Calendar/Gmail scopes before offering those integrations to arbitrary public accounts.
- Add CAPTCHA/bot protection to public authentication once provider keys are configured.
- Publish an external support/privacy contact for users who cannot sign in.
- Have the final Terms/Privacy/minor-use language reviewed by an appropriate adult/legal reviewer.
- Run the signed-in multi-account/device test matrix in `../docs/launch/TEST-MATRIX.md` before the public launch switch is flipped.

## Known non-blocking follow-ups

- Several older RLS policies can still be optimized to evaluate `auth.uid()` once per statement as traffic grows.
- New indexes can show as unused until real production traffic exercises their related queries.
- Open-ended Planner recurrence still needs a long-term occurrence-extension strategy.
- Beta and `main` currently have independent history; reconcile them deliberately rather than force-merging either branch.
