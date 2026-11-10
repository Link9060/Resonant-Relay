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
