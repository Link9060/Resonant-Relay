# ARROW integrated beta: autonomous self-improvement development track

## SOURCE-OF-TRUTH (READ FIRST)

**This branch works on the integrated ARROW Beta, not a standalone website.**

- Canonical integration/deployment owner: `Link9060/Resonant-Relay` branch `beta`
- Actual beta URL: https://link9060.github.io/Resonant-Relay/arrow/orbit/
- Active unmerged canonical integration review: [PR #114](https://github.com/Link9060/Resonant-Relay/pull/114), branch `review/integrated-arrow-beta-ui-20261110`, **targeting** `beta`.
- This improvement branch: `improve/arrow-integrated-beta` starts from that review branch's already-improved code, not from a standalone `main`. Its stacked DRAFT PR must initially target the review branch to avoid sneaking into beta.
- After #114 is *approved and actually merged* into `beta`, inspect ancestry and retarget/rebase the improvement PR to `beta` only after verifying there are no duplicate/conflicting changes. Do not merge or deploy automatically.
- Mandatory branch-local instructions: root `AGENTS.md`, `relay/docs/INTEGRATED_BETA_UI_REVIEW.md`, pinned integration manifest `relay/scripts/arrow-beta-centers.json`, packaging script `relay/scripts/build-arrow-beta.mjs`, and cross-branch source-of-truth [issue #115](https://github.com/Link9060/Resonant-Relay/issues/115).

**WARNING: Wrong targets for the integrated beta**

- `Link9060/Resonant-Arrow` branches `arrow-integration-beta` and `beta/arrow-integration` are **standalone gateway development**, NOT the integrated beta described here.
- `Link9060/Resonant-Orbit:main` and `Link9060/Resonant-Waypoint:main` are NOT what Relay packages. The exact embedded module source comes from SHA pins in the Relay manifest.
- [Relay PR #113](https://github.com/Link9060/Resonant-Relay/pull/113) and earlier Orbit #6 / Waypoint #8 are main/standalone-derived drafts and MUST NOT be treated as beta fixes.
- To change embedded Orbit or Waypoint, work from **the currently pinned SHA** on a review branch in the corresponding repository, commit reviewed fixes, update the *exact pinned SHA* on this Relay integration review branch, and verify the integrated beta build. Do not modify the standalone default branch and claim the beta changed.

## Development mission

Continuously **find, reproduce, test and resolve** high-value problems in the current integrated ARROW beta. Focus on:
1. Actual functionality: click and keyboard behavior; shortcuts/access; dropdown locations; route/navigation behavior; safe auth and permissions; persistence.
2. UI polish: five Adapt identities (Core/Bloom/Haven/Atelier/Pulse), dark/light/accent combinations, readable surfaces, mobile/responsive layout, popovers, owner controls, calm Waypoint, uncluttered Orbit.
3. Reliability/performance/accessibility: crashes, failed network state, loading/error/empty states, semantics, keyboard access, reduced motion, contrast, performance and maintainable tests.
4. Structural engineering: remove regressions and fragile duplication without broad refactors or unauthorized feature launches.

Choose small, objectively testable batches. Prefer reproducing with an actual test or screenshot before changing code. No fabricated test results, QA claims, accessibility scores, deployments, or preview URLs. Track actual commands, runs, files, commit SHAs and evidence. Make reversible source changes and keep one durable review queue in `relay/docs/SELF_IMPROVEMENT_QUEUE.md`.

## Git/automation guardrails

- Own only the isolated `improve/arrow-integrated-beta` branch and explicitly prefixed work branches. Do not edit `beta`, `main`, the existing #114 branch or its PR directly.
- Keep one ongoing **draft** stacked pull request targeting `review/integrated-arrow-beta-ui-20261110` for these changes, never auto-merge.
- On each scheduled run, inspect latest integration PR #114, manifest, branch history, relevant issue/PR comments and tests. Coordinate on overlap; do not undo other fixes, repeat work or replace pin commits blindly.
- Verify with repository lint/typecheck/build and targeted browser/Playwright tests when available. Verify integrated `npm run beta:target` and `node scripts/build-arrow-beta.mjs` with appropriate dependencies and actual module pins. If tools, network, credentials or compute prevent tests, record limitations rather than claim success.
- No production/beta deployment; no release merge, account/security configuration changes, spending, paid services, posts, personal-data experiments, or external customer actions without informed user approval. No bypasses for age/service terms or access controls.
- Record cumulative unapproved checks by stable ID, exact manual test, implementation commit, evidence and reviewer state. Do not clear the queue until explicit approval and authorized merge.
- The user should still approve PR #114 separately, then review this branch's stacked PR and any subsequent updated base.
