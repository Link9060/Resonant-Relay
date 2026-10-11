# ARROW planning and UI pass — 2026-10-11

Scope: GitHub Pages ARROW beta. Inspected Orbit, Relay dashboard, Atlas live list, RAVIN conversation/tools, and all six Waypoint tabs. Public Relay main is not part of this release.

| # | Reproduced or source-confirmed problem | Fix |
|---|---|---|
| 1 | Black header fade hides light-mode Waypoint headings/actions. | Header uses the current surface and border. |
| 2 | Tab navigation retains an unrelated URL; refresh/back returns the wrong view. | URL navigation and browser back/forward follow the selected tab. |
| 3 | Capture text and editable proposals disappear on reload/navigation. | Account-scoped, seven-day draft recovery on this device; approval clears it. |
| 4 | Saved Capture summaries cannot reopen their full reasoning. | Review opens input, summary, intent, route, signals and questions in a viewing-only mode. |
| 5 | Overdue tasks scheduled in the future can disappear from both Today and Plans. | Overdue tasks remain in Today; future scheduling is also visible in Plans. |
| 6 | Current objective simply selects the first unfinished task. | Deadline/priority ordering with prerequisite, estimate, calendar and scheduled-time checks. |
| 7 | Empty Today says nothing needs attention despite unfinished upcoming tasks. | Shows unfinished-account count and directs the user to Plans or schedule preview. |
| 8 | Calendar hides duration and all-day semantics. | Start/end ranges and explicit all-day/unknown-end labels in Waypoint and shared controls. |
| 9 | Other calendar weeks lack month/year context. | Explicit ISO date range above the week. |
| 10 | Proposal type and destination can contradict one another. | Type-specific placement choices and approval validation. |
| 11 | Invalid daily schedule windows reach the planner. | Immediate validation of both clocks and end-after-start. |
| 12 | A preview remains actionable after tasks/events/window change. | Input fingerprint disables approval and requests a fresh preview. |
| 13 | Cancel leaves old edit type, date and estimate in a new entry. | Complete editor reset to a new task, current local date and 30-minute estimate. |
| 14 | Shared Tasks stops at 80 rows, concealing newer completed work. | Open/completed/all filters, stable ordering and explicit pagination; newest completed work first. |
| 15 | Relay dashboard excludes overdue/scheduled work and unnamed completion buttons are inaccessible. | Consistent daily inclusion plus named, stateful completion controls and named quick-add/focus buttons. |

Additional improvements: pending completion protection, readable proposal inputs in light mode, compact mobile header action, shared calendar end-time entry, and invalidation of proposals when raw Capture text changes.

Validation: 61 Relay regressions, 13 Waypoint regressions, Relay lint (no errors; existing warnings), TypeScript, and integrated five-center export (50 pages, 1011 boot assets, one imported module dependency). The beta build now runs the new daily-plan regressions as well as account-safety checks. Three additional React/jsdom checks passed against the actual Waypoint components: unfinished draft/history navigation, stale-preview rejection and cancel/reset. The atomic database regression also passed duration, future placement, retry idempotency, task/calendar schedule synchronization, collision rejection, rollback and account ownership checks. PR #99 CI and its GitHub Pages deployment succeeded. Fresh authenticated post-deploy verification remains pending: the cloud browser session expired during the overnight run and now reaches sign-in.

Limits: Capture drafts recover on this device; approved account data remains shared across centers/devices. History reopening is viewing-only. Daily next-action capacity uses the current calendar and an explicit 10 PM cutoff; the week preview has adjustable working hours. A preview schedules remaining unscheduled work and does not silently move existing bookings. Imported Google/Microsoft calendars remain read-only. No messages were sent to contacts during testing.
