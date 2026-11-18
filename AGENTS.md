# IMPORTANT: ARROW integrated beta source of truth

**Read this before changing anything named ARROW, Orbit, Waypoint, Relay Beta, Owner Controls, Adapt, or the beta's shared appearance.**

## Which site is the user asking about?

The user's current **integrated ARROW Beta** is:
https://link9060.github.io/Resonant-Relay/arrow/orbit/

**Source and deployment owner:** `Link9060/Resonant-Relay`, branch **`beta`**. The deployed pages live under `/Resonant-Relay/arrow/*`, not the standalone `Resonant-Orbit`, `Resonant-Waypoint`, or `Resonant-Arrow` sites.

**Never edit `main` or a standalone app and claim the integrated beta was fixed.** Do not assume repo names or a successful CI build indicate which beta was modified. If the user says "beta" without a specific URL, check the URL and this deployment chain first.

## Critical build routing

- Deployment: `.github/workflows/deploy-pages.yml` **from `beta`**.
- Packaging: `relay/scripts/build-arrow-beta.mjs`.
- Embedded commit pins: `relay/scripts/arrow-beta-centers.json` (exact full commit SHAs).
- Shared shell, theme, appearance, settings, data: `relay/public/arrow-shell.js` and `relay/public/arrow-shell.css`, plus Relay `relay/src/**`.
- Embedded Orbit code: `Link9060/Resonant-Orbit` **at the SHA pinned in the JSON manifest**, not its `main` branch.
- Embedded Waypoint code: `Link9060/Resonant-Waypoint` **at its pinned SHA**, not its `main` branch.
- Embedded Atlas/RAVIN likewise use pinned SHAs.

A change to an embedded module requires BOTH (1) commit code onto a review branch starting from the pinned SHA and (2) update the corresponding exact SHA in the **Relay beta review branch** manifest. Until that pin is changed, the integrated beta is still using the old module. Never silently repin unrelated centers or auto-merge.

## Required workflow for AI and contributors

1. Identify the user's exact URL and component. Check `git rev-parse --abbrev-ref HEAD`, `.github/workflows/deploy-pages.yml`, the packaging script, and the JSON manifest.
2. For integrated beta work, branch **from Relay `beta`**, not `main`. For Orbit/Waypoint, branch **from the pinned commit**, not default `main`.
3. Compare the actual deployed feature implementation with user-reported behavior. Make minimal changes; preserve auth, access gates, user data, and route semantics.
4. For embedded module changes, update the commit pin in the Relay review branch and test the **integrated** packaging flow, not just the standalone module.
5. Open a **draft PR targeting Relay `beta`**; link module PRs. No production/beta deployment or merge without explicit user approval.
6. Report exactly what is changed on each branch, what is pinned into the integration PR, what tests ran, and what remains unverified. Never equate "PR CI passed" with "live beta updated."

## User's outstanding UI review checklist

- Atelier structural/spacing problems.
- Owner Control Center oversized on desktop/mobile.
- Orbit number shortcuts 1, 2, 4 fail while 3 and custom shortcuts work. Do not bypass genuine access restrictions.
- Orbit custom-location dropdown stuck on "To-dos".
- Light/dark mode and Adapt identity/accent palettes sometimes produce unreadable contrast.
- Preset picker dropdown arrows and popovers extend offscreen.
- Orbit's left mini-menu overcrowded; Bloom too busy.
- Weather widget: expand a small card to an interactive, detailed forecast with user-selected location and privacy-safe optional geolocation.
- Waypoint: calm, professional UI across pages and ARROW identities, not decoration without functionality.

Keep this checklist updated in `relay/docs/INTEGRATED_BETA_UI_REVIEW.md`.

**This file is branch-scoped.** A patch elsewhere is not deployed merely because the path or component name matches.
