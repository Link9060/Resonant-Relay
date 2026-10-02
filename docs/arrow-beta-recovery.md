# ARROW recovery — 2026-10-01

Public was restored to its pre-integration trees with forward rollback commits. Do not publish integration to main, enterarrow-domain, or deployment-prep. New work belongs on arrow-integration-beta; the existing Relay beta branch publishes the integrated beta artifact.

## Current deployment

- Relay beta commit: 47375fc9caf6fd74c84c0be528bffed6c00ffff7.
- GitHub Actions run 36916720627 completed successfully, including deployment.
- Beta entry remains https://link9060.github.io/Resonant-Relay/.
- Orbit, Waypoint, Atlas, and RAVIN are packaged under /Resonant-Relay/arrow/. scripts/arrow-beta-centers.json pins their exact commits.
- Original Relay beta saved at backup/beta-before-arrow-repair-oct1 (437993c1f1ffcc45185eefd2798d0f7bc2391976).

## Repaired and checked

- Gateway center root normalization and same-upstream redirect rewriting; 11 gateway tests passed.
- Shared beta destination resolution, preserved deep links, and Back restoration; 24 Orbit shell tests passed.
- Beta's own login, callback, sign-out, and access checks restored; 29 Relay regression tests passed.
- Shared script/style packaging and Next export paths; 97 boot assets checked across six entry pages.
- Relay, Orbit, and Waypoint static production builds pass. Relay lint and typecheck pass (existing warnings remain).
- Live unauthenticated Orbit beta redirects to beta sign-in instead of public.

## Shared database recovery

Removed the 22 newly added restrictive arrow_active_account policies, the scheduled-task sync trigger, the new scheduling RPC, and the private account-active helper. Restored original current_app_role. Existing ownership RLS and all user records were preserved. Do not reinstate a profile-row requirement across other apps.

## Still required before claiming completion

- Signed-in browser verification of module navigation, shared task/calendar edits, support/staff permissions, quick locations, entertainment controls, theme/motion, Atlas navigation, and RAVIN chat. Secure Google sign-in reached passkey verification, but success has not been verified.
- A separate beta API backend and safe scheduling persistence for AI planning. Automatic approval review rejected creating arrow-ravin-beta on Render because it interpreted the user's existing-beta choice as excluding a separate public service. Obtain explicit user approval before retrying; do not modify public RAVIN to bypass the rejection.
- Current beta next-item selection and schedule preview read the user's stored calendar/task/plan data. Schedule Apply is explicitly unavailable; these are not a verified AI scheduling implementation.
- Project-wide account enforcement and global moderation need authenticated backend verification after the restrictive-policy rollback. The permission-checked staff UI is present, but this does not prove enforcement across all modules.
- Review every item in the user's original scope. Do not equate passing builds with all workflows complete or production readiness.

RAVIN's standalone website must remain separate from its ARROW-specific interface. Public Relay restriction remains unchanged.
