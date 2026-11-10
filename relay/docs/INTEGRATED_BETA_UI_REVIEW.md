# Integrated ARROW Beta UI review

**Canonical beta URL:** https://link9060.github.io/Resonant-Relay/arrow/orbit/

## What actually gets deployed

1. `Link9060/Resonant-Relay` `beta` fires `.github/workflows/deploy-pages.yml`.
2. `relay/scripts/build-arrow-beta.mjs` reads `relay/scripts/arrow-beta-centers.json`.
3. It checks out **exact commit SHAs** of standalone Orbit, Waypoint, Atlas, RAVIN, builds or copies them, and places them under `relay/out/arrow/`.
4. It copies Relay beta's `relay/public/arrow-shell.js` and `.css` into the integrated ARROW routes.
5. Only a successful deployment of the **beta** branch updates the live beta URL. Module PRs and CI alone do not.

## Review task board (Nov 10, 2026)

| Item | Original symptom | Source of truth | Verification |
| --- | --- | --- | --- |
| A | Atelier layout/structure glitches | pinned embedded Orbit + Relay shell CSS | visual desktop/mobile |
| B | Owner controls oversized | Relay beta staff components | owner/role checks |
| C | Orbit keys 1,2,4 do nothing; 3 works | pinned embedded Orbit and Orbit access state | Playwright interactive shortcuts |
| D | Custom location select stuck on To-dos | pinned Orbit `src/components/orbit-locations.tsx` | select options, async tasks/plans |
| E | Light/dark and preset accents unreadable | Relay beta theme CSS and Orbit Adapt styles | cross-theme contrast |
| F | Preset dropdown arrows offscreen | shared shell + Adapt selectors | 320/375/768px popup bounds |
| G | Orbit left mini-menu too cluttered | pinned Orbit command panel | usability |
| H | Bloom too cluttered | pinned Orbit/Relay identities | visual QA |
| I | Weather widget opens detailed interactive forecast | pinned Orbit dashboard | API / keyboard / location permission |
| J | Waypoint looks unpolished | pinned Waypoint `waypoint-shell.tsx`, workspace CSS | mobile/desktop QA |

## Change attribution

Treat `Link9060/Resonant-Orbit/pull/6`, `Link9060/Resonant-Waypoint/pull/8`, and `Link9060/Resonant-Relay/pull/113` as **standalone-main-derived drafts**, NOT integrated beta fixes. Review/reimplement relevant changes against actual beta baselines and pin the new commits; do not bulk-merge those PRs into `beta`.

## QA gates

- Confirm the pin points at the exact new embedded module commit.
- Confirm integrated beta build runs via `node scripts/build-arrow-beta.mjs`.
- Confirm accessibility and keyboard behavior, all Adapt presets, both color schemes, popovers and tiny viewports.
- Require manual visual QA and explicit owner approval before merging onto `beta`.
- Where something remains unverified, say so explicitly.

## Review implementation status

Last prepared: November 10, 2026. **These changes are on review branches only and have not been merged or deployed.**

| ID | Status | Beta review implementation | QA |
| --- | --- | --- | --- |
| A: Atelier | Implemented, screenshot QA passed at 390/1280 | Embedded Orbit semantic text/layout, solid Atelier cards and narrow-header fit; Waypoint structure | Inspect intermediate widths and real account data |
| B: Owner controls | Implemented, visual QA pending | Relay beta shared staff workspace is centered/compact on desktop, full-height responsive on mobile | Verify owner/admin/moderator access and account tools |
| C: 1/2/4 | Implemented, Chromium regression passed | Fixed stale `accessMode` closure in embedded Orbit global hotkey effect | Recheck after login, keyboard inputs, game mode |
| D: Custom location | Implemented, Chromium regression passed | Native dropdown replaced with explicit task/plan/ARROW destination radio selector | Verify account persistence and task list |
| E: Light/dark | Implemented, 4.5:1 action contrast test passed | Relay, Orbit and Waypoint semantic text/surface tokens; paired action and disabled colors across ten identity/theme combinations | Real user accent presets and every text element still need QA |
| F: Popovers | Partially addressed | Relay beta appearance/settings and staff forms clamped inside narrow viewport | Real mobile browser still needed |
| G: Orbit mini-menu | Implemented | Three primary actions and collapsible secondary workspace tools; Connections under Settings | Review discoverability |
| H: Bloom | Implemented, screenshot QA passed at 390/1280 | Reduced Orbit/Waypoint ornaments, shadows and visual density | Aesthetic review remains subjective |
| I: Weather | Implemented, mocked API browser QA passed | Compact widget opens full location picker or 12-hour/7-day forecast. ZIP/city lookup, optional browser geolocation (rounded coordinates), account-scoped cache | Verify real API and denial/offline handling; no automatic permission prompt |
| J: Waypoint | Implemented, security/build QA passed; visual QA pending | Responsive sections, nav, typography and clearer labels for tasks/plans/goals; active planning preserved | Review all six tabs and saved data |

## Review branch and CI relationships

- Correct integration PR: https://github.com/Link9060/Resonant-Relay/pull/114 (target `beta`).
- Embedded Orbit PR: https://github.com/Link9060/Resonant-Orbit/pull/7 (pinned baseline `beta-foundation-polish-20261023`).
- Embedded Waypoint PR: https://github.com/Link9060/Resonant-Waypoint/pull/9 (same pinned beta baseline).
- Run `npm run beta:target` in Relay to print and verify current module pins and prevent mis-targeted PRs.
- The integrated `beta-package` job builds Orbit + Waypoint + Atlas + RAVIN at those exact pins and tests shared routing.
- Orbit Chromium browser regression tests for access, quick locations, dashboard keyboard safety and location-editor keyboard safety run on the pinned branch. Waypoint's strict dependency audit passes after upgrading Next.js to **16.4.6** with an npm-generated package lockfile.
- No merges to the live `beta` branch without explicit owner approval.


## Visual QA and durable source-of-truth issue

- Browser QA screenshots: https://github.com/Link9060/Resonant-Orbit/actions/runs/42879272195 (artifact `integrated-arrow-beta-visual-qa`, 20 screenshots, Core/Bloom/Haven/Atelier/Pulse × light/dark × 390px/1280px).
- Verified narrow Orbit header stays within viewport and Orbit/Dashboard button labels are not clipped in the covered test cases.
- Screenshots exposed poor contrast on disabled buttons. The paired action backgrounds and 4.5:1 test were added after visual inspection; this verifies one class of controls, **not every element** or all custom-accent combinations.
- Future AI source-of-truth issue, visible regardless of branch: https://github.com/Link9060/Resonant-Relay/issues/115.
- Integrated beta live URL remains unchanged until the user approves merging PR #114 into Relay `beta` and a successful deployment follows.
