# Changelog

## 1.0.2 Preview — September 10, 2026

- Changed the beta build label to Relay 1.0.2 while keeping beta access controls in place.
- Added an in-app **What’s New** update history beside the sidebar collapse control.
- Added a clean one-time update brief for returning users, tracked per device and per version.
- Added clearer notification guidance explaining that the operating system must allow notifications for the browser as well as Relay itself.
- Kept the public production build on 1.0.0 until Relay 1.0.1 is intentionally released.

## 1.0.1 — Upcoming public release

- Public release is planned once device/browser notifications are reliable.
- Final release focus is messaging, planning, account, navigation, and notification stability.

## Earlier private-beta readiness work

- Added repository launch inventory, status, manual-operations, rollback, security review, device matrix, and beta runbook documentation.
- Prepared forward-only Supabase integrity hardening for connection requests and atomic group leaving.
- Routed request lifecycle actions through operation-specific RPCs and added conservative request throttling in the prepared migration.
- Added client-side message length validation and neutral failure messages.
- Added pull-request CI for lint, typecheck, and static build.

> Database migrations, provider configuration, Pages deployment, and signed-in production testing remain manual verification steps.
