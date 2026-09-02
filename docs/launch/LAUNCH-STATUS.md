# Relay launch status

**Updated:** 2026-09-02  
**Branch:** `freebuff/relay-launch-readiness`  
**Evidence scope:** GitHub-visible repository only; no live Supabase, dashboard, provider, or signed-in browser access.

| Item | Status | Evidence | GitHub commit/PR | Manual action remaining | Owner |
|---|---|---|---|---|---|
| Production source recoverable | ✅ | Full Next.js source, migrations, lockfile, and Pages workflow are under `relay/`; head `1f23ebc` | Current source head | Confirm this is the intended production source | Levi |
| Reproducible dependency install | ✅ | `relay/package-lock.json`; Pages/CI use `npm ci` | Current source head / CI | None beyond workflow result | Engineering |
| Static Pages build definition | ✅ | `relay/next.config.js` uses static export and base path; Pages workflow uploads `relay/out` | Current source head | Confirm Pages settings point to Actions | Levi |
| Request mutation authorization | ⚠️ Prepared | `0012_launch_integrity_hardening.sql` removes broad update and adds accept/decline/cancel RPCs; contacts actions use RPCs for response actions | Pending | Apply migration and run two-account/RLS tests | Levi |
| Atomic group leave | ⚠️ Prepared | `0012` removes direct deletes, requires membership, synchronizes both rows, promotes deterministic replacement, cleans last group | Pending | Apply migration and run group integrity tests | Levi |
| Request creation abuse controls | ⚠️ Prepared | `0012` adds authenticated sender-derived request RPC with duplicate/reverse/connection checks and 10-per-10-minute limit | Pending | Apply migration and test against staging | Levi |
| Message abuse controls | ❌ | Client still inserts messages directly; DB length/participant checks exist but no rate limit | Pending | Implement/apply before 10–20 beta | Engineering |
| Block/remove/report | ❌ | No implementation found in recovered source | Pending | Design and implement before broader beta | Engineering |
| Privacy/beta policy | ❌ | No privacy, terms, deletion, or support flow found | Pending | Publish support address and review policy | Levi |
| Account deletion | ❌ | No trusted deletion Edge Function or route found | Pending | Deploy trusted function and configure secrets | Levi |
| Friendly centralized errors | ⚠️ | Contact/chat action errors are now neutral; broader route/error handling remains | Pending | Complete mapping and signed-in testing | Engineering |
| CI pull-request checks | ⚠️ Prepared | `relay/.github/workflows/ci.yml` runs npm ci, lint, typecheck, and build | Pending workflow run | Confirm Actions permissions/results | Engineering |
| SQL regression tests | ❌ | No executable database test suite found; manual test requirements are documented | Pending | Add/run disposable or local Supabase tests | Engineering/Levi |
| Security-definer review | ⚠️ Prepared | `SECURITY-DEFINER-REVIEW.md` records static review; live definitions/advisor unavailable | Pending | Confirm against live project | Engineering/Levi |
| Performance indexes/RLS optimization | ⚠️ | Audit handoff reports findings; live schema not independently verified | Pending | Confirm with advisor and apply separate migration | Levi |
| Signed-in device matrix | ⚠️ | Cannot test with GitHub-only access | Pending | Execute `TEST-MATRIX.md` manually | Levi/testers |
| Notifications/realtime | ⚠️ | Trigger and policy source exists; live configuration/delivery unverified | Pending | Confirm publication, triggers, owner isolation, and device behavior | Levi |

## Readiness verdict

- **Existing closed testing (2–5):** **NO-GO until migration `0012` is applied and the two-account core loop passes.**
- **Controlled 10–20 beta:** **NO-GO.** Abuse controls, blocking/removal, privacy, deletion, and manual device verification remain incomplete.
- **Public promotion:** **NO-GO.** Privacy/legal/guardian review, reliable deletion, reporting, monitoring, and incident controls remain incomplete.

Repository changes can prepare fixes, but cannot certify that Supabase migrations, dashboard settings, providers, Pages deployment, or signed-in behavior are live.
