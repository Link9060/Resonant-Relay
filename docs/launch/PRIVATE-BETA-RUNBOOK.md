# Relay private-beta runbook

## Stage 1 — closed crash-test group (2–5 existing testers)

Start only after the real source is in GitHub, CI/build passes, the request and group-leave migrations are applied, existing data still loads, the two-account flow passes, and no secret exposure is found.

Ask testers to refresh deep links, briefly go offline, sign out mid-session, use mobile, and exercise requests, messages, groups, notifications, and planner flows.

## Stage 2 — controlled invitation (10–20 testers)

Proceed only after Stage 1 has run for several days without catastrophic errors; blocking/removal, request/message limits, privacy/beta pages, deletion or a monitored deletion process, friendly errors, device matrix, and rollback are complete.

Invite individually. Keep a current tester list and a way to pause invitations immediately.

## Stage 3 — broader/public beta

Do not recommend until reliable deletion, report review, monitoring/incident response, privacy/legal/guardian review appropriate to a student-focused service, suitable OAuth consent/scopes, database backup/performance review, and an access pause mechanism are complete.

## Bug reporting

Use the approved support channel. Ask for device/browser, route, approximate time, steps to reproduce, expected result, visible error text (with tokens and personal data removed), and whether retry/sign-in restored the flow. Do not request message contents unless strictly necessary; use synthetic text or message IDs where possible.

## Incident pause

Pause invitations immediately for suspected data leakage, unauthorized access/mutation, message loss, deletion failure, credential exposure, or repeated crashes. Preserve minimal diagnostic evidence, check GitHub Actions/Pages and Supabase logs through the owner, rotate exposed credentials through the provider, and do not resume until the owner records a reviewed go/no-go decision.
