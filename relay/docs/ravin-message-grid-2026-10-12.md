# RAVIN user-message grid regression — 2026-10-12

The Waypoint-style redesign made every message use a narrow label column followed by a flexible content column. Legacy user-message rules still placed the body in column one. The user's screenshot reproduced the resulting letter-by-letter wrapping in a narrow bubble.

The fix assigns named grid areas to role, body and actions, with mirrored flexible/narrow tracks for user messages and a single-track layout on mobile. User text and copy/edit buttons can no longer auto-place in the label track.

A new regression loads every local stylesheet from the actual RAVIN index, in page order, and checks the computed grid tracks and body/action areas for both user and assistant messages. It failed against the previously deployed CSS and passed against the corrected CSS. All seven RAVIN UI regressions passed locally. The integrated beta build runs this check against its pinned RAVIN source. Fresh signed-in browser rendering is still pending; no new account access was requested after the prior sign-in request was declined.
