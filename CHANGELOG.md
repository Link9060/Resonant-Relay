# Changelog

## 1.0.7 Beta — Focus Update

- Weather now uses a user-entered 5-digit ZIP code instead of browser geolocation.
- Relay remembers the ZIP on the current device, shows the resolved city/state and ZIP in the widget, and provides Refresh Weather and Change ZIP controls.
- Invalid ZIP codes now show an inline error instead of requesting location permission.

## 1.0.3 Beta

- Added visible Relay role titles for Owners, Admins, and Moderators.
- Added a separate private, account-synced Notes tab alongside To Do.
- Added block-based writing for text, headings, lists, checkboxes, and quotes.
- Added note search, pinning, deletion, and automatic saving.
- Structured Notes so later versions can connect notes, tasks, and files in a visual knowledge graph for RAVIN.

## 1.0.2 Preview — September 10, 2026

- Changed the beta build label to Relay 1.0.2 while keeping beta access controls in place.
- Added an in-app **What’s New** update history beside the sidebar collapse control.
- Added a clean one-time update brief for returning users, tracked per device and per version.
- Added clearer notification guidance explaining that the operating system must allow notifications for the browser as well as Relay itself.
- Set the public production build to 1.0.2 and the beta development channel to 1.0.3.

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
