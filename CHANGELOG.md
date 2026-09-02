# Changelog

## Unreleased — Relay private-beta readiness

- Added repository launch inventory, status, manual-operations, rollback, security review, device matrix, and beta runbook documentation.
- Prepared forward-only Supabase integrity hardening for connection requests and atomic group leaving.
- Routed request lifecycle actions through operation-specific RPCs and added conservative request throttling in the prepared migration.
- Added client-side message length validation and neutral failure messages.
- Added pull-request CI for lint, typecheck, and static build.

> Database migrations, provider configuration, Pages deployment, and signed-in production testing remain manual verification steps.
