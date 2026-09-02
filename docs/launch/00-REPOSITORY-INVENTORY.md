# Relay repository inventory

**Inspection date:** 2026-09-02  
**Repository:** `Link9060/Resonant-Relay`  
**Inspected branch:** `freebuff/relay-launch-readiness` (created from `main`)  
**Default branch observed locally:** `main`  
**Current source head:** `1f23ebc084e1f1bed6fdb770909099baef60b2cd`

## Scope and evidence limits

This inventory uses only the GitHub-connected checkout and Git-visible evidence. It does not verify Supabase, Google Cloud, email, DNS, Pages settings, production logs, or signed-in browser behavior.

The checkout is shallow/grafted: the visible history contains one commit, so older commits, deleted files, tags, releases, pull requests, workflow history, and other branches cannot be independently reconstructed from the local clone. `git ls-remote --heads --tags origin` exposed only `main`; no tags were exposed.

## Findings

| Item | Finding |
|---|---|
| Default branch / head | `main` at `1f23ebc` (`Restore GitHub Pages-safe navigation`) |
| Branches | Only local `main`, `freebuff/relay-launch-readiness`, and remote `origin/main` were visible; no other remote branches exposed |
| Tags / releases | No tags were visible; release metadata is not available in this checkout |
| Recoverable source | Full Relay source is present under `relay/`; source recovery is **not blocked** |
| Framework | Next.js `16.3.3`, React `19.2.8`, TypeScript |
| Hosting strategy | Static Next export (`output: 'export'`) with base path `/Resonant-Relay`, deployed by `.github/workflows/deploy-pages.yml` to GitHub Pages |
| Package manager | npm |
| Lockfile | `relay/package-lock.json` is present; no second lockfile was found |
| Build | `npm run build` (`next build`), static output in `relay/out/` |
| Lint | `npm run lint` |
| Type check / tests | No dedicated typecheck or test scripts are defined; no test tree was found |
| Environment template | `relay/.env.example` exists and uses placeholder values only; it documents both browser-safe and server-only variables |
| Supabase migrations | `relay/supabase/migrations/0001_foundation.sql` through `0011_fix_conversation_participants_rls.sql` |
| Supabase function source | `relay/supabase/functions/google-hub/index.ts` |
| CI / deployment | Pages workflow runs npm ci, lint, and build on pushes to `main`; no PR CI workflow was found |
| Pages/source mismatch | The repository now contains a static-export source and Pages workflow, but Pages settings, workflow history, deployed SHA, and production parity are not independently verifiable here |
| Server-runtime mismatch | Source contains server-only Google token code and service-role access, while Pages is static-only. The static client paths must not import these modules; external trusted runtime deployment/configuration remains an owner/manual concern |

## Source tree summary

- `relay/src/app/`: login, authenticated app routes, planner, calendar, email, profile, and auth callback.
- `relay/src/components/`: contacts, chats, planner, notifications, navigation, and profile UI.
- `relay/src/lib/`: Supabase clients, actions, Google integrations, notifications, and handwritten database types.
- `relay/supabase/migrations/`: foundation, social core, planner, student hub, notifications, security hardening, Pages grants, OAuth state protection, cron, and RLS recursion fixes.
- `.github/workflows/deploy-pages.yml`: GitHub Pages build/deploy workflow.

## Immediate launch-readiness observations

1. The recovered source is sufficient to continue; do not create `SOURCE-RECOVERY-REQUIRED.md`.
2. The original broad request UPDATE and direct group-membership DELETE grants/policies remain in the migration history and need forward-only hardening migrations.
3. `relay/supabase/migrations/0012_launch_integrity_hardening.sql` prepares authenticated request creation and operation-specific request lifecycle RPCs; it is not live until manually applied.
4. `relay/src/lib/actions/chats.ts` still inserts messages directly through the Data API; database-authoritative participant/length checks exist, but message rate limiting is not implemented.
5. `relay/package.json` now has a typecheck script and `.github/workflows/ci.yml` provides PR lint/typecheck/build checks; no executable database test suite is present.
6. No GitHub-visible evidence proves that migrations `0006`–`0011` were applied to the live database.
7. No GitHub-visible evidence proves signed-in routing, mobile behavior, notification delivery, OAuth configuration, account deletion, blocking, reporting, or production secret configuration.

## Safe continuation point

Continue on `freebuff/relay-launch-readiness` with small, forward-only commits. Do not modify `main`, merge automatically, rewrite history, or claim live database/deployment verification. Any SQL migration prepared here remains **prepared for manual application** until Levi confirms application and tests against the intended Supabase project.
