# ARROW Integrated Beta: Self-improvement Review Queue

**Developing:** `Link9060/Resonant-Relay:improve/arrow-integrated-beta` (stacked off current integrated review `review/integrated-arrow-beta-ui-20261110`).
**Canonical live beta (unchanged):** `Link9060/Resonant-Relay:beta`.
**Wrong-target warning:** Standalone `Resonant-Arrow` branches and standalone Orbit/Waypoint `main` are NOT the integrated beta.
**State:** No self-improvement code implementation yet; this branch has documentation only.

## Unapproved test queue

| ID | Work item | Status | Test/verification |
| --- | --- | --- | --- |
| ARSI-001 | Correct integration target and safe branching guardrails | DOCS ONLY | Review ARROW_SELF_IMPROVEMENT.md, AGENTS.md, PR #114 and source-of-truth issue #115; verify new PR targets only the existing integration review branch |
| ARSI-002 | Accessible, robust keyboard shortcuts and custom location selector | PENDING AUDIT | Reproduce on embedded Orbit pinned build; test 1/2/3/4 (when authorized), typing focus, location options, persistence |
| ARSI-003 | Theme/identity/accent readability and popover bounds | PENDING AUDIT | All 5 identities × light/dark at narrow/wide widths, with at least two accent presets; verify text contrast and screen bounds |
| ARSI-004 | Owner center and navigation responsive reliability | PENDING AUDIT | Verify owner/admin/moderator permissions, 320px/768px/1280px, no horizontal overflow or unauthorized controls |
| ARSI-005 | Waypoint/Orbit functional and aesthetic polish | PENDING AUDIT | Visit integrated embedded destinations, verify actions and saved data, review calm layouts across desktop/mobile |
| ARSI-006 | Integrated build checks and safe final preview | PENDING VERIFICATION | Run or inspect exact pinned integrated packaging, typecheck/lint/tests, make no claim of deployment without evidence |

These are **review priorities**, not claims these defects persist after PR #114. Audit first, avoid duplicating changes already in the existing PR.

## Changes log

- 2026-11-14: Created dedicated branch from correct unmerged integrated ARROW review branch and documented exact beta routing. No functional fixes, browser verification, deployment or production merge performed.

## Owner approval

Never merge into integration branch or `beta`, or deploy to live beta, solely because CI passes. Require owner review of the exact SHA and explicit permission. Preserve unapproved items with stable IDs until resolved and reviewed.
