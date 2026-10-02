# ARROW beta integration checklist

Keep all development on arrow-integration-beta and the existing Relay beta deployment. Public remains at the rollback version. Build success is not evidence that every signed-in workflow is complete.

| Requested outcome | Current implementation | Remaining verification/work |
| --- | --- | --- |
| Full integration and shared tasks, plans, calendar | Common account/session key and owned shared tables; successful Relay task writes now broadcast the same change event used by Waypoint and Orbit | Authenticated create/edit/complete across modules and connected calendar flows |
| Entertainment mode | Four games, ship-to-Flight entry, pause/resume, hidden-tab pause, timer cleanup, Flight range steering, dialog focus containment/restoration | Real browser touch/layout/keyboard pass |
| Remove RAVIN startup | Active v02 entry scripts have no startup screen; unused legacy prototypes are separate | Verify first load while signed in |
| RAVIN UI optimized for ARROW | ARROW-only layout/styles and tasks/calendar/Atlas/Waypoint entry points; standalone UI remains separate | Responsive visual review and authenticated chat/file checks |
| Page switching | Gateway redirects, beta route resolver, Back restoration, Full motion override; local dialogs/Atlas own Escape | Signed-in route/Back/touch pass |
| Relay widgets | Shared calendar/task refresh and configurable widget layout | Widget add/remove and layout persistence in browser |
| Global moderation/support in Orbit | Permission-checked support/staff panel and Relay redirects; owner/moderator UI regression checks | Backend enforcement over every module and authenticated staff actions; do not restore global profile-row requirements |
| Interactable Orbit ship | Opens Flight | Browser pointer/touch check |
| Waypoint | Shared task/event/plan editor, calendar/week navigation, deterministic schedule preview | AI planning and atomic schedule Apply require approved beta backend; authenticated editor validation |
| Global settings/theme/accent/experiences | Shared appearance controls; Full/Reduced/System regression checks; correct preferences copy, replay link, beta sign-out; preference reset preserves account data | Responsive visual comparison of all experiences and sign-out browser verification |
| Atlas | Map/list/search/neighborhood navigation, depth, pan/zoom, keyboard access; pinch no longer selects on release | Large authenticated graph, touch and visual polish pass |
| Locations 0–9 | Four module locations, account-saved 5–9 shortcuts and 0 next move; shortcut choices refresh after planning writes | Authenticated add/remove/renumber and next-event checks; 0 uses calendar ordering until AI backend approval |
| Professional code sweep | Combined exports/asset validation; patched beta Next dependency and clear Orbit/Relay audits; shared settings labels and keyboard conflicts fixed | Continue module-by-module browser review; do not call the full project production-ready |

## October 2 repair checks

- Orbit: 26 shell regression checks and one mounted game-session test pass.
- Relay: lint/typecheck and task-write notification/motion/access regression checks pass.
- Combined beta export: 97 boot assets validated across six entry pages.
- Beta browser remains signed out. Previous Google sign-in stopped at passkey verification; no authenticated success has been confirmed.
- Separate Render beta API creation was rejected by automatic approval review. Explicit approval is still needed; no new service or public backend mutation was made.
