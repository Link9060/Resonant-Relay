# Shortcuts and compact preferences — 2026-10-13

Removed the large Relay and RAVIN color/palette grids and replaced the eight experience cards with compact native dropdowns. Intensity, Lock-In and reset remain. Existing saved palettes are retained when switching experience; shared colors/theme are available from the ARROW Appearance menu.

Relay's desktop navigation shortcuts previously worked only in Still mode. They now work across desktop experiences: Space dashboard; C chats; T tasks; N notes; P planner; K calendar; L links; F contacts; comma settings; D shared light/dark; M experience; question mark help. Typing, composition, repeated keys, modifiers and modal controls are protected. Escape closes shortcut overlays even when a button has focus, before the shared handler can navigate to Orbit. Shared panel opening closes local shortcut overlays.

RAVIN file/memory drawers consume Escape before global navigation. Local menus/sidebar overlays also consume Escape. IME Enter does not submit the composer; slash focus ignores fields and modified key combinations. The shared Escape handler respects events already handled locally.

Validation: 12 React/DOM/stylesheet regressions passed locally, including three new Relay checks and two new RAVIN checks. Four RAVIN account/stream checks and JavaScript syntax checks passed. CI runs the Relay regressions and the RAVIN checks against the beta's pinned source during integrated packaging. Live signed-in visual verification remains pending; the prior declined browser sign-in was not requested again.
