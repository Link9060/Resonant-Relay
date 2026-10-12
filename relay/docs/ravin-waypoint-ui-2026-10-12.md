# RAVIN UI redevelopment — 2026-10-12

Scope: embedded RAVIN in the ARROW GitHub Pages beta. Waypoint is the visual reference: 250px sidebar, 96px header, quiet borders, rounded controls and contained content. This is a layout and interaction release; intelligence prompts and backend model behavior are unchanged.

Screenshot/source findings corrected:
- Conversation titles and mode labels ran together; history now uses two distinct lines and bounded title overflow.
- Long active-chat titles crowded toolbar controls; the header now truncates titles and wraps controls at narrower widths.
- RAVIN's padded double-frame shell differed from Waypoint; the beta now shares Waypoint's sidebar/header proportions and surface hierarchy.
- Collapsing the sidebar left the shared tool links at expanded width; the collapsed rail now hides wide controls.
- Sidebar collapse was a nested button-like element inside the account button; it is now a separate native button.
- Search shortcut focused a hidden input in the collapsed sidebar; it now opens the sidebar first.
- Appearance overlays had competing fixed coordinates and could exceed their available height; one positioning calculation now supplies bounded CSS coordinates and scroll height, including the smaller keyboard viewport.
- Opening an ARROW tool left the settings popover open; opening either closes the other, including keyboard-pinned launchers.
- Left-sidebar tool anchors placed a 430px panel outside the viewport; panel coordinates now clamp both edges and honor visual-viewport dimensions.
- A shared panel opened alongside the full launcher menu; the launcher now collapses when its panel opens.
- Appearance names could split mid-word in the launcher; labels retain whole words and use a two-column launcher on small screens.

Regression evidence: six new DOM/geometry regressions passed against actual RAVIN shell and appearance scripts; the two existing shared task/calendar UI regressions passed; four RAVIN account/stream tests passed. JavaScript syntax and targeted Relay lint passed (existing arrow-shell warning remains). Integrated beta packaging runs the RAVIN UI regressions against the pinned source.

Verification limit: a live signed-in visual walkthrough is pending. The current cloud browser redirects to sign-in, and the secure sign-in request was declined. No live chat messages, task writes or account changes were performed. Mobile/keyboard panel coordinates were tested; full mobile visual rendering was not verified.
