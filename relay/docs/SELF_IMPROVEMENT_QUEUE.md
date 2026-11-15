# ARROW Integrated Beta: Self-improvement Review Queue

**Developing:** `Link9060/Resonant-Relay:improve/arrow-integrated-beta` (stacked off current integrated review `review/integrated-arrow-beta-ui-20261110`).
**Canonical live beta (unchanged):** `Link9060/Resonant-Relay:beta`.
**Wrong-target warning:** Standalone `Resonant-Arrow` branches and standalone Orbit/Waypoint `main` are NOT the integrated beta.
**State:** SI mobile command-dock optimization was released separately to live integrated beta via PR #117 (merge `2d5401b22f3b0fe2d306769f65c7714e05ee219e`; deployment run #43661970274 succeeded). This SI branch remains unmerged and contains other unapproved stacked work. Manual phone QA of shipped change still recommended.

## Unapproved test queue

| ID | Work item | Status | Test/verification |
| --- | --- | --- | --- |
| ARSI-001 | Correct integration target and safe branching guardrails | DOCS ONLY | Review ARROW_SELF_IMPROVEMENT.md, AGENTS.md, PR #114 and source-of-truth issue #115; verify new PR targets only the existing integration review branch |
| ARSI-002 | Accessible, robust keyboard shortcuts and custom location selector | PENDING AUDIT | Reproduce on embedded Orbit pinned build; test 1/2/3/4 (when authorized), typing focus, location options, persistence |
| ARSI-003 | Theme/identity/accent readability and popover bounds | PENDING AUDIT | All 5 identities × light/dark at narrow/wide widths, with at least two accent presets; verify text contrast and screen bounds |
| ARSI-004 | Owner center and navigation responsive reliability | PENDING AUDIT | Verify owner/admin/moderator permissions, 320px/768px/1280px, no horizontal overflow or unauthorized controls |
| ARSI-005 | Waypoint/Orbit functional and aesthetic polish | PENDING AUDIT | Visit integrated embedded destinations, verify actions and saved data, review calm layouts across desktop/mobile |
| ARSI-006 | Integrated build checks and safe final preview | PENDING VERIFICATION | Run or inspect exact pinned integrated packaging, typecheck/lint/tests, make no claim of deployment without evidence |
| ARSI-007 | Mobile Command Dock clarity and touch targets | RELEASED TO BETA VIA PR #117; PHONE QA PENDING | At widths 320, 375, 390, 680px open ARROW tray: Orbit/RAVIN/Notes/Tasks/Calendar/Appearance/Settings visible; Focus/Links/Support hidden until **More tools**; tap to reveal/hide and verify panels open; resize to desktop and verify all controls remain available; check keyboard focus, Escape and scroll at 200% zoom. Verify all five Adapt identities, including Bloom and Pulse. Code: JS commit `2db4b0aff28987e9270834ad2a68e28f9fda8805`, CSS commit `6c2966737b56c172bd138d0a1e88e7af08cf651e`. |

These are **review priorities**, not claims these defects persist after PR #114. Audit first, avoid duplicating changes already in the existing PR.

## Changes log

- 2026-11-14: Created dedicated branch from correct unmerged integrated ARROW review branch and documented exact beta routing.
- 2026-11-14: Mobile-first command dock update committed. The **More tools** button toggles secondary Focus, Links and Support controls only at narrow widths; smaller header, tighter spacing and 44px minimum toggle and footer link touch targets. Existing panel event handlers and role gates remain intact. Changes have **not** been live-deployed; browser QA is pending. GitHub CI for head commit may still be running; verify final job result before approval.

- 2026-11-14: Mobile-only release [PR #117](https://github.com/Link9060/Resonant-Relay/pull/117) merged to `beta` at `2d5401b22f3b0fe2d306769f65c7714e05ee219e`; the [GitHub Pages integrated beta deployment](https://github.com/Link9060/Resonant-Relay/actions/runs/43661970274) succeeded. **Do not re-release or duplicate this mobile change.** When rebasing SI against updated `beta`, preserve #114's independent unapproved fixes but deduplicate this shipped JS/CSS patch. Manual phone appearance/interaction QA remains outstanding.

## Owner approval

Never merge into integration branch or `beta`, or deploy to live beta, solely because CI passes. Require owner review of the exact SHA and explicit permission. Preserve unapproved items with stable IDs until resolved and reviewed.
