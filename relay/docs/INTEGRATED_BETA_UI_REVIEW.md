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
| A: Atelier | Implemented, visual QA pending | Embedded Orbit semantic text/layout and solid Atelier cards; embedded Waypoint Atelier structure and row overflow | Inspect all identities at 320/375/768/1440px |
| B: Owner controls | Implemented, visual QA pending | Relay beta shared staff workspace is centered/compact on desktop, full-height responsive on mobile | Verify owner/admin/moderator access and account tools |
| C: 1/2/4 | Implemented, Chromium regression passed | Fixed stale `accessMode` closure in embedded Orbit global hotkey effect | Recheck after login, keyboard inputs, game mode |
| D: Custom location | Implemented, Chromium regression passed | Native dropdown replaced with explicit task/plan/ARROW destination radio selector | Verify account persistence and task list |
| E: Light/dark | Implemented, visual QA pending | Relay, Orbit, and Waypoint semantic text/surface contrast tokens; accent remains cosmetic | Check all identities and accents manually |
| F: Popovers | Partially addressed | Relay beta appearance/settings and staff forms clamped inside narrow viewport | Real mobile browser still needed |
| G: Orbit mini-menu | Implemented | Three primary actions and collapsible secondary workspace tools; Connections under Settings | Review discoverability |
| H: Bloom | Implemented, visual QA pending | Reduced Orbit/Waypoint ornaments, shadows, visual density | Check mobile/desktop |
| I: Weather | Implemented, functional browser/API QA pending | Existing ZIP lookup now opens keyboard-accessible forecast with current conditions, next 12 hours and seven days | Verify real API and failure states; city-name search and geolocation not added |
| J: Waypoint | Implemented, visual QA pending | Responsive section layouts, typography and accessible navigation without removing active planning functions | Review all six tabs and saved data |

## Review branch and CI relationships

- Correct integration PR: https://github.com/Link9060/Resonant-Relay/pull/114 (target `beta`).
- Embedded Orbit PR: https://github.com/Link9060/Resonant-Orbit/pull/7 (pinned baseline `beta-foundation-polish-20261023`).
- Embedded Waypoint PR: https://github.com/Link9060/Resonant-Waypoint/pull/9 (same pinned beta baseline).
- Run `npm run beta:target` in Relay to print and verify current module pins and prevent mis-targeted PRs.
- The integrated `beta-package` job builds Orbit + Waypoint + Atlas + RAVIN at those exact pins and tests shared routing.
- Orbit Chromium browser regression tests for access and quick locations pass. Waypoint's strict dependency audit passes after upgrading Next.js to **16.4.6** with an npm-generated package lockfile.
- No merges to the live `beta` branch without explicit owner approval.

