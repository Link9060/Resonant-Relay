# ARROW UI and packaging punch list

Source-backed UI corrections. Shared declarations are listed per affected selector/state; these are not a claim of 500 independent functional bugs. No repeated font-size replacements are included.

503 corrections listed before implementation, now implemented. 321 source declarations verified against the ledger.

The count includes selector/state corrections from shared declarations. It does not mean 503 independent bugs or 503 visually verified pages. Signed-in visual review remains outstanding because the local browser preview was unavailable.

| ID | Area | Concrete correction | Source | Status |
|---|---|---|---|---|
| UI-001 | Ship | Remove the permanent circular ship background | Orbit / shared shell / beta build | implemented |
| UI-002 | Ship | Remove the permanent circular ship border | Orbit / shared shell / beta build | implemented |
| UI-003 | Ship | Remove the card shadow from the ship | Orbit / shared shell / beta build | implemented |
| UI-004 | Ship | Keep a transparent touch hitbox around the glyph | Orbit / shared shell / beta build | implemented |
| UI-005 | Ship | Make clicking the ship pulse instead of launching Flight | Orbit / shared shell / beta build | implemented |
| UI-006 | Ship | Prevent ship pointer-down from dragging the world | Orbit / shared shell / beta build | implemented |
| UI-007 | Ship | Prevent ship double-click from entering entertainment | Orbit / shared shell / beta build | implemented |
| UI-008 | Ship | Describe the actual pulse action to assistive technology | Orbit / shared shell / beta build | implemented |
| UI-009 | Ship | Disable the ship during travel and mode transitions | Orbit / shared shell / beta build | implemented |
| UI-010 | Ship | Remove the occluded ship from the tab sequence | Orbit / shared shell / beta build | implemented |
| UI-011 | Ship | Prevent clicks on the ship behind the sphere | Orbit / shared shell / beta build | implemented |
| UI-012 | Ship | Replay pulse feedback on every click | Orbit / shared shell / beta build | implemented |
| UI-013 | Ship | Use a single short pulse rather than an infinite ring | Orbit / shared shell / beta build | implemented |
| UI-014 | Ship | Respect reduced motion for ship feedback | Orbit / shared shell / beta build | implemented |
| UI-015 | Ship | Match the ship glyph to light and dark mode | Orbit / shared shell / beta build | implemented |
| UI-016 | Ship | Keep the glyph centered in the invisible hitbox | Orbit / shared shell / beta build | implemented |
| UI-017 | Orbit layout | Remove fabricated recent-signal rows from the command home | Orbit / shared shell / beta build | implemented |
| UI-018 | Orbit layout | Move duplicate center rows into the System subview | Orbit / shared shell / beta build | implemented |
| UI-019 | Orbit layout | Make the command home a contained card | Orbit / shared shell / beta build | implemented |
| UI-020 | Orbit layout | Reduce the default command home height | Orbit / shared shell / beta build | implemented |
| UI-021 | Orbit layout | Separate command footer actions from quick actions | Orbit / shared shell / beta build | implemented |
| UI-022 | Orbit layout | Use one compact center-route rail | Orbit / shared shell / beta build | implemented |
| UI-023 | Orbit layout | Remove the extra center-category label above each landmark | Orbit / shared shell / beta build | implemented |
| UI-024 | Orbit layout | Avoid repeating readiness text beside every landmark | Orbit / shared shell / beta build | implemented |
| UI-025 | Orbit layout | Keep front-facing landmark names legible | Orbit / shared shell / beta build | implemented |
| UI-026 | Orbit layout | Increase the contrast of landmark names in light mode | Orbit / shared shell / beta build | implemented |
| UI-027 | Orbit layout | Remove the solid rectangle behind the Orbit center label | Orbit / shared shell / beta build | implemented |
| UI-028 | Orbit layout | Remove the center label dark text-shadow in light mode | Orbit / shared shell / beta build | implemented |
| UI-029 | Orbit layout | Reduce inspector content when no destination is selected | Orbit / shared shell / beta build | implemented |
| UI-030 | Orbit layout | Keep zoom and navigator controls inside the inspector width | Orbit / shared shell / beta build | implemented |
| UI-031 | Orbit layout | Remove the default inspector card shadow | Orbit / shared shell / beta build | implemented |
| UI-032 | Orbit layout | Collapse the left card on small screens with an accessible details control | Orbit / shared shell / beta build | implemented |
| UI-033 | Orbit layout | Keep the details expansion inside the available viewport | Orbit / shared shell / beta build | implemented |
| UI-034 | Orbit layout | Move quick locations away from the bottom route rail | Orbit / shared shell / beta build | implemented |
| UI-035 | Orbit layout | Keep floating pins readable without repeating generic subtitles | Orbit / shared shell / beta build | implemented |
| UI-036 | Orbit layout | Stop displaying a hardcoded ten-location count | Orbit / shared shell / beta build | implemented |
| UI-037 | Orbit layout | Describe route availability rather than claiming a live connection | Orbit / shared shell / beta build | implemented |
| UI-038 | Orbit layout | Use consistent surface tokens in the header chips | Orbit / shared shell / beta build | implemented |
| UI-039 | Orbit layout | Hide decoration on a small screen rather than clipping controls | Orbit / shared shell / beta build | implemented |
| UI-040 | Orbit layout | Improve the spacing between the world and navigation chrome | Orbit / shared shell / beta build | implemented |
| UI-041 | Entertainment | Wait for the collapse before swapping landmark labels | Orbit / shared shell / beta build | implemented |
| UI-042 | Entertainment | Stop automatic world rotation during the transition | Orbit / shared shell / beta build | implemented |
| UI-043 | Entertainment | Stop ship orbiting during the transition | Orbit / shared shell / beta build | implemented |
| UI-044 | Entertainment | Darken the world during the opening half-second | Orbit / shared shell / beta build | implemented |
| UI-045 | Entertainment | Collapse existing sphere points into the center | Orbit / shared shell / beta build | implemented |
| UI-046 | Entertainment | Reform the same sphere points after the midpoint | Orbit / shared shell / beta build | implemented |
| UI-047 | Entertainment | Stage DIRECTION IS OVERRATED before the entertainment title | Orbit / shared shell / beta build | implemented |
| UI-048 | Entertainment | Stage GIVE YOUR LIFE ENTERTAINMENT after the midpoint | Orbit / shared shell / beta build | implemented |
| UI-049 | Entertainment | Reverse the sequence with ALRIGHT BACK TO WORK | Orbit / shared shell / beta build | implemented |
| UI-050 | Entertainment | Prevent rapid double-clicks from stacking transition timers | Orbit / shared shell / beta build | implemented |
| UI-051 | Entertainment | Cancel the midpoint timer when Orbit unmounts | Orbit / shared shell / beta build | implemented |
| UI-052 | Entertainment | Cancel the completion timer when Orbit unmounts | Orbit / shared shell / beta build | implemented |
| UI-053 | Entertainment | Use a short static transition for reduced motion | Orbit / shared shell / beta build | implemented |
| UI-054 | Entertainment | Keep the source landmarks out of keyboard navigation while collapsing | Orbit / shared shell / beta build | implemented |
| UI-055 | Entertainment | Reveal colored game landmarks after reforming | Orbit / shared shell / beta build | implemented |
| UI-056 | Entertainment | Keep entertainment colors independent of the selected personal accent | Orbit / shared shell / beta build | implemented |
| UI-057 | Entertainment | Make the dark entertainment world work when the app is in light mode | Orbit / shared shell / beta build | implemented |
| UI-058 | Entertainment | Label the current games as prototypes awaiting rebuild | Orbit / shared shell / beta build | implemented |
| UI-059 | Entertainment | Prevent unfinished games from claiming to be ready-to-play | Orbit / shared shell / beta build | implemented |
| UI-060 | Entertainment | Provide an explicit accessible return-to-direction control | Orbit / shared shell / beta build | implemented |
| UI-061 | Entertainment | Support returning with Escape | Orbit / shared shell / beta build | implemented |
| UI-062 | Entertainment | Keep prototype information in a dismissible focus-contained dialog | Orbit / shared shell / beta build | implemented |
| UI-063 | Entertainment | Restore focus after closing prototype information | Orbit / shared shell / beta build | implemented |
| UI-064 | Entertainment | Stop the first center click from recentering before a double-click | Orbit / shared shell / beta build | implemented |
| UI-065 | Shared bar | Replace the long crowded expansion with a bounded controls tray | Orbit / shared shell / beta build | implemented |
| UI-066 | Shared bar | Keep the tray inside the viewport width | Orbit / shared shell / beta build | implemented |
| UI-067 | Shared bar | Group tray controls into a legible responsive grid | Orbit / shared shell / beta build | implemented |
| UI-068 | Shared bar | Remove duplicate ARROW wordmarks inside the tray | Orbit / shared shell / beta build | implemented |
| UI-069 | Shared bar | Keep the header lockup visible when the tray opens | Orbit / shared shell / beta build | implemented |
| UI-070 | Shared bar | Bridge the pointer gap between trigger and tray | Orbit / shared shell / beta build | implemented |
| UI-071 | Shared bar | Delay hover closure so the tray can be reached | Orbit / shared shell / beta build | implemented |
| UI-072 | Shared bar | Cancel delayed closure when the pointer returns | Orbit / shared shell / beta build | implemented |
| UI-073 | Shared bar | Close the tray on Escape before navigating to another center | Orbit / shared shell / beta build | implemented |
| UI-074 | Shared bar | Restore focus to the tray trigger when Escape closes it | Orbit / shared shell / beta build | implemented |
| UI-075 | Shared bar | Give the tray an independent surface and border | Orbit / shared shell / beta build | implemented |
| UI-076 | Shared bar | Keep small-screen tray controls reachable without horizontal scrolling | Orbit / shared shell / beta build | implemented |
| UI-077 | Packaging | Give every packaged stylesheet a content-based revision | Orbit / shared shell / beta build | implemented |
| UI-078 | Packaging | Give every packaged script a content-based revision | Orbit / shared shell / beta build | implemented |
| UI-079 | Packaging | Validate every exported HTML page instead of six sample entry pages | Orbit / shared shell / beta build | implemented |
| UI-080 | Packaging | Validate same-origin imported module dependencies | Orbit / shared shell / beta build | implemented |
| UI-081 | Packaging | Emit a versioned center manifest for the beta bundle | Orbit / shared shell / beta build | implemented |
| UI-082 | Packaging | Include the username help route in package validation | Orbit / shared shell / beta build | implemented |
| UI-083 | Packaging | Check that beta guards are present on every center entry page | Orbit / shared shell / beta build | implemented |
| UI-084 | Packaging | Keep beta assets inside the Resonant-Relay path | Orbit / shared shell / beta build | implemented |
| UI-085 | Theme and contrast | ::selection: color #050505 → var(--ui-on-contrast) | Resonant-Orbit/src/app/globals.css:51 | implemented |
| UI-086 | Theme and contrast | .orbit-app: background radial-gradient(circle at 50% 49%, rgb(var(--orbit-fg) / 0.032), transparent 34%),     #050505 → radial-gradient(circle at 50% 49%, rgb(var(--orbit-fg) / 0.032), transparent 34%),     rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/globals.css:72 | implemented |
| UI-087 | Theme and contrast | .header-meta: color rgb(var(--orbit-fg) / 0.42) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:161 | implemented |
| UI-088 | Theme and contrast | .craft-orbit: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:334 | implemented |
| UI-089 | Theme and contrast | .core-kicker: color rgb(var(--orbit-fg) / 0.34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:373 | implemented |
| UI-090 | Theme and contrast | .orbit-shortcuts-label: color rgb(var(--orbit-fg) / 0.32) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:423 | implemented |
| UI-091 | Theme and contrast | .orbit-shortcut: color rgb(var(--orbit-fg) / 0.46) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:446 | implemented |
| UI-092 | Theme and contrast | .destination-node:hover .node-landmark: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:561 | implemented |
| UI-093 | Theme and contrast | .destination-node.is-selected .node-landmark: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:561 | implemented |
| UI-094 | Theme and contrast | .node-status: color rgb(var(--orbit-fg) / 0.34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:614 | implemented |
| UI-095 | Theme and contrast | .node-code: color rgb(var(--orbit-fg) / 0.36) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:628 | implemented |
| UI-096 | Theme and contrast | .inspector-topline: color rgb(var(--orbit-fg) / 0.38) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:679 | implemented |
| UI-097 | Theme and contrast | .route-state: color rgb(var(--orbit-fg) / 0.38) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:687 | implemented |
| UI-098 | Theme and contrast | .route-state.is-staged: color rgb(var(--orbit-fg) / 0.32) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:695 | implemented |
| UI-099 | Touch target | .world-control-row button: min-height 30px → 44px | Resonant-Orbit/src/app/globals.css:724 | implemented |
| UI-100 | Touch target | .control-hint: min-height 30px → 44px | Resonant-Orbit/src/app/globals.css:724 | implemented |
| UI-101 | Theme and contrast | .world-control-row button: color rgb(var(--orbit-fg) / 0.46) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:731 | implemented |
| UI-102 | Theme and contrast | .control-hint: color rgb(var(--orbit-fg) / 0.46) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:731 | implemented |
| UI-103 | Theme and contrast | .world-control-row kbd: color rgb(var(--orbit-fg) / 0.44) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:768 | implemented |
| UI-104 | Touch target | .focus-button: min-height 34px → 44px | Resonant-Orbit/src/app/globals.css:783 | implemented |
| UI-105 | Theme and contrast | .handoff-state: color rgb(var(--orbit-fg) / 0.34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:804 | implemented |
| UI-106 | Theme and contrast | .stage-footer: color rgb(var(--orbit-fg) / 0.3) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:818 | implemented |
| UI-107 | Theme and contrast | .travel-craft: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:854 | implemented |
| UI-108 | Theme and contrast | .incoming-craft: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:854 | implemented |
| UI-109 | Theme and contrast | .travel-transfer-veil: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/globals.css:897 | implemented |
| UI-110 | Theme and contrast | .travel-transfer-particle: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/globals.css:924 | implemented |
| UI-111 | Theme and contrast | .travel-wake: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/globals.css:952 | implemented |
| UI-112 | Theme and contrast | .incoming-trail: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/globals.css:952 | implemented |
| UI-113 | Theme and contrast | .arrival-code: color rgb(var(--orbit-fg) / 0.4) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1077 | implemented |
| UI-114 | Theme and contrast | .arrival-primary: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1131 | implemented |
| UI-115 | Theme and contrast | .travel-status-dot: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/globals.css:1188 | implemented |
| UI-116 | Theme and contrast | .incoming-bh-disk-main: background linear-gradient(90deg,       transparent 0 3%,       rgb(var(--orbit-fg) / .12) 9%,       rgb(var(--orbit-fg) / .88) 24%,       #fff 42%,       rgb(var(--orbit-fg) / .96) 55%,       rgb(var(--orbit-fg) / .54) 76%,       rgb(var(--orbit-fg) / .08) 92%,       transparent 100%) → linear-gradient(90deg,       transparent 0 3%,       rgb(var(--orbit-fg) / .12) 9%,       rgb(var(--orbit-fg) / .88) 24%,       rgb(var(--ui-contrast) / 1) 42%,       rgb(var(--orbit-fg) / .96) 55%,       rgb(var(--orbit-fg) / .54) 76%,       rgb(var(--orbit-fg) / .08) 92%,       transparent 100%) | Resonant-Orbit/src/app/globals.css:1402 | implemented |
| UI-117 | Theme and contrast | .incoming-bh-core: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/globals.css:1478 | implemented |
| UI-118 | Theme and contrast | .incoming-craft: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:1493 | implemented |
| UI-119 | Theme and contrast | .incoming-source-label: color rgb(var(--orbit-fg) / .42) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1506 | implemented |
| UI-120 | Theme and contrast | 0%: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/globals.css:1532 | implemented |
| UI-121 | Theme and contrast | 34%: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/globals.css:1532 | implemented |
| UI-122 | Theme and contrast | .navigator-heading p: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1663 | implemented |
| UI-123 | Touch target | .navigator-close: width 34px → 44px | Resonant-Orbit/src/app/globals.css:1678 | implemented |
| UI-124 | Touch target | .navigator-close: height 34px → 44px | Resonant-Orbit/src/app/globals.css:1679 | implemented |
| UI-125 | Theme and contrast | .navigator-close: color rgb(var(--orbit-fg) / .44) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1684 | implemented |
| UI-126 | Theme and contrast | .navigator-close:hover: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:1691 | implemented |
| UI-127 | Theme and contrast | .navigator-search: color rgb(var(--orbit-fg) / .48) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1704 | implemented |
| UI-128 | Theme and contrast | .navigator-search input::placeholder: color rgb(var(--orbit-fg) / .28) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1724 | implemented |
| UI-129 | Theme and contrast | .navigator-search kbd: color rgb(var(--orbit-fg) / .42) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1733 | implemented |
| UI-130 | Theme and contrast | .navigator-footer kbd: color rgb(var(--orbit-fg) / .42) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1733 | implemented |
| UI-131 | Viewport fit | .navigator-results: max-height min(54vh, 430px) → min(54dvh, 430px) | Resonant-Orbit/src/app/globals.css:1739 | implemented |
| UI-132 | Theme and contrast | .navigator-index: color rgb(var(--orbit-fg) / .3) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1784 | implemented |
| UI-133 | Theme and contrast | .navigator-result-copy span: color rgb(var(--orbit-fg) / .38) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1814 | implemented |
| UI-134 | Theme and contrast | .navigator-result-description: color rgb(var(--orbit-fg) / .38) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1814 | implemented |
| UI-135 | Theme and contrast | .navigator-route: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1829 | implemented |
| UI-136 | Theme and contrast | .navigator-empty: color rgb(var(--orbit-fg) / .38) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1841 | implemented |
| UI-137 | Theme and contrast | .navigator-footer: color rgb(var(--orbit-fg) / .32) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1852 | implemented |
| UI-138 | Theme and contrast | .startup-shell: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/globals.css:1879 | implemented |
| UI-139 | Theme and contrast | .startup-shell: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:1880 | implemented |
| UI-140 | Theme and contrast | .startup-skip: color rgb(var(--orbit-fg) / .46) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1902 | implemented |
| UI-141 | Theme and contrast | .startup-skip:hover: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:1908 | implemented |
| UI-142 | Theme and contrast | .startup-dot: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/globals.css:1938 | implemented |
| UI-143 | Theme and contrast | .startup-prompt: color rgb(var(--orbit-fg) / .46) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:1952 | implemented |
| UI-144 | Viewport fit | .arrival-landmark: margin-top 10vh → 10dvh | Resonant-Orbit/src/app/globals.css:2186 | implemented |
| UI-145 | Touch target | .arrow-system-control: height 32px → 44px | Resonant-Orbit/src/app/globals.css:2478 | implemented |
| UI-146 | Touch target | .arrow-system-settings: height 32px → 44px | Resonant-Orbit/src/app/globals.css:2478 | implemented |
| UI-147 | Touch target | .arrow-system-control: min-height 32px → 44px | Resonant-Orbit/src/app/globals.css:2479 | implemented |
| UI-148 | Touch target | .arrow-system-settings: min-height 32px → 44px | Resonant-Orbit/src/app/globals.css:2479 | implemented |
| UI-149 | Touch target | .arrow-system-control: width 32px → 44px | Resonant-Orbit/src/app/globals.css:2546 | implemented |
| UI-150 | Theme and contrast | .arrow-auth-gate: background radial-gradient(circle at 50% 44%, rgb(var(--orbit-fg) / .045), transparent 30%),     #050505 → radial-gradient(circle at 50% 44%, rgb(var(--orbit-fg) / .045), transparent 30%),     rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/globals.css:2623 | implemented |
| UI-151 | Theme and contrast | .arrow-auth-brand p: color rgb(var(--orbit-fg) / .35) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:2673 | implemented |
| UI-152 | Theme and contrast | .arrow-auth-kicker: color rgb(var(--orbit-fg) / .35) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:2673 | implemented |
| UI-153 | Theme and contrast | .arrow-auth-checking: color rgb(var(--orbit-fg) / .45) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:2711 | implemented |
| UI-154 | Theme and contrast | .arrow-auth-checking span: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/globals.css:2719 | implemented |
| UI-155 | Theme and contrast | .arrow-auth-google: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:2742 | implemented |
| UI-156 | Theme and contrast | .arrow-auth-divider: color rgb(var(--orbit-fg) / .28) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:2755 | implemented |
| UI-157 | Theme and contrast | .arrow-auth-form label: color rgb(var(--orbit-fg) / .45) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:2775 | implemented |
| UI-158 | Theme and contrast | .arrow-auth-form input: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:2787 | implemented |
| UI-159 | Theme and contrast | .arrow-auth-form input::placeholder: color rgb(var(--orbit-fg) / .25) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:2792 | implemented |
| UI-160 | Theme and contrast | .arrow-auth-form button: border 1px solid #fff → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Orbit/src/app/globals.css:2796 | implemented |
| UI-161 | Theme and contrast | .arrow-auth-form button: background #f7f7f5 → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/globals.css:2797 | implemented |
| UI-162 | Theme and contrast | .arrow-auth-form button: color #080808 → var(--ui-on-contrast) | Resonant-Orbit/src/app/globals.css:2798 | implemented |
| UI-163 | Theme and contrast | .arrow-auth-form button:hover: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/globals.css:2802 | implemented |
| UI-164 | Theme and contrast | .arrow-auth-note span: color rgb(var(--orbit-fg) / .36) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:2836 | implemented |
| UI-165 | Theme and contrast | .arrow-auth-legal: color rgb(var(--orbit-fg) / .36) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:2836 | implemented |
| UI-166 | Theme and contrast | .orbit-intro-enter span:last-child: background #f5f5f5 → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/globals.css:3024 | implemented |
| UI-167 | Theme and contrast | .orbit-intro-enter span:last-child: color #090909 → var(--ui-on-contrast) | Resonant-Orbit/src/app/globals.css:3025 | implemented |
| UI-168 | Theme and contrast | .orbit-intro-enter:hover: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:3035 | implemented |
| UI-169 | Theme and contrast | .orbit-intro-enter:focus-visible: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:3035 | implemented |
| UI-170 | Theme and contrast | .command-panel-head p: color rgb(var(--orbit-fg) / .31) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3093 | implemented |
| UI-171 | Theme and contrast | .command-section-title > span: color rgb(var(--orbit-fg) / .31) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3093 | implemented |
| UI-172 | Theme and contrast | .command-field > span: color rgb(var(--orbit-fg) / .31) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3093 | implemented |
| UI-173 | Theme and contrast | .command-info-card > span: color rgb(var(--orbit-fg) / .31) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3093 | implemented |
| UI-174 | Theme and contrast | .command-system-card > div > span: color rgb(var(--orbit-fg) / .31) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3093 | implemented |
| UI-175 | Theme and contrast | .command-online: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3113 | implemented |
| UI-176 | Theme and contrast | .command-back: color rgb(var(--orbit-fg) / .42) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3139 | implemented |
| UI-177 | Theme and contrast | .command-back:hover: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:3148 | implemented |
| UI-178 | Theme and contrast | .command-back:focus-visible: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:3148 | implemented |
| UI-179 | Theme and contrast | .command-account-strip small: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3212 | implemented |
| UI-180 | Theme and contrast | .command-module-copy small: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3212 | implemented |
| UI-181 | Theme and contrast | .command-connection-row small: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3212 | implemented |
| UI-182 | Theme and contrast | .command-settings-row small: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3212 | implemented |
| UI-183 | Theme and contrast | .command-system-card small: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3212 | implemented |
| UI-184 | Theme and contrast | .command-info-card small: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3212 | implemented |
| UI-185 | Theme and contrast | .command-recent small: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3212 | implemented |
| UI-186 | Theme and contrast | .command-entry: color rgb(var(--orbit-fg) / .38) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3228 | implemented |
| UI-187 | Theme and contrast | .command-entry input::placeholder: color rgb(var(--orbit-fg) / .27) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3250 | implemented |
| UI-188 | Touch target | .command-entry button: width 28px → 44px | Resonant-Orbit/src/app/globals.css:3255 | implemented |
| UI-189 | Touch target | .command-entry button: height 28px → 44px | Resonant-Orbit/src/app/globals.css:3256 | implemented |
| UI-190 | Theme and contrast | .command-entry button:hover: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:3266 | implemented |
| UI-191 | Theme and contrast | .command-section-title button: color rgb(var(--orbit-fg) / .28) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3286 | implemented |
| UI-192 | Theme and contrast | .command-quick-grid button: color rgb(var(--orbit-fg) / .48) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3314 | implemented |
| UI-193 | Theme and contrast | .command-recent > button:hover: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:3395 | implemented |
| UI-194 | Theme and contrast | .command-settings-link: color rgb(var(--orbit-fg) / .34) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3408 | implemented |
| UI-195 | Touch target | .command-presence-grid button: min-height 35px → 44px | Resonant-Orbit/src/app/globals.css:3456 | implemented |
| UI-196 | Theme and contrast | .command-presence-grid button: color rgb(var(--orbit-fg) / .4) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3463 | implemented |
| UI-197 | Theme and contrast | .command-presence-grid button.is-active i: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/globals.css:3482 | implemented |
| UI-198 | Touch target | .command-system-card button: min-height 29px → 44px | Resonant-Orbit/src/app/globals.css:3529 | implemented |
| UI-199 | Theme and contrast | .command-system-card button:hover: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:3541 | implemented |
| UI-200 | Touch target | .navigator-command-chips button: min-height 31px → 44px | Resonant-Orbit/src/app/globals.css:3626 | implemented |
| UI-201 | Theme and contrast | .navigator-command-chips button: color rgb(var(--orbit-fg) / .42) → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3633 | implemented |
| UI-202 | Touch target | .command-quick-grid button: min-height 42px → 44px | Resonant-Orbit/src/app/globals.css:3741 | implemented |
| UI-203 | Theme and contrast | .orbit-extra-location: color #f2f3f7 → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:3768 | implemented |
| UI-204 | Theme and contrast | .orbit-extra-location kbd: border 1px solid #ffffff25 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Orbit/src/app/globals.css:3769 | implemented |
| UI-205 | Theme and contrast | .orbit-extra-location small: color #a9afbe → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3771 | implemented |
| UI-206 | Theme and contrast | .orbit-location-tools button: border 1px solid #ffffff22 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Orbit/src/app/globals.css:3774 | implemented |
| UI-207 | Theme and contrast | .orbit-location-editor button: border 1px solid #ffffff22 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Orbit/src/app/globals.css:3774 | implemented |
| UI-208 | Theme and contrast | .orbit-location-tools button: background #ffffff0c → rgb(var(--ui-contrast) / 0.047058823529411764) | Resonant-Orbit/src/app/globals.css:3774 | implemented |
| UI-209 | Theme and contrast | .orbit-location-editor button: background #ffffff0c → rgb(var(--ui-contrast) / 0.047058823529411764) | Resonant-Orbit/src/app/globals.css:3774 | implemented |
| UI-210 | Theme and contrast | .orbit-location-editor: border 1px solid #ffffff24 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Orbit/src/app/globals.css:3776 | implemented |
| UI-211 | Theme and contrast | .orbit-location-editor: background #11141bea → rgb(var(--ui-surface) / 0.9176470588235294) | Resonant-Orbit/src/app/globals.css:3776 | implemented |
| UI-212 | Theme and contrast | .orbit-location-editor: color #f2f3f7 → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/globals.css:3776 | implemented |
| UI-213 | Theme and contrast | .orbit-location-editor p: color #abb2c1 → var(--ui-muted) | Resonant-Orbit/src/app/globals.css:3779 | implemented |
| UI-214 | Theme and contrast | .orbit-location-editor input: background #1b202a → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/globals.css:3782 | implemented |
| UI-215 | Theme and contrast | .orbit-location-editor select: background #1b202a → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/globals.css:3782 | implemented |
| UI-216 | Theme and contrast | .orbit-location-editor input: border 1px solid #ffffff25 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Orbit/src/app/globals.css:3782 | implemented |
| UI-217 | Theme and contrast | .orbit-location-editor select: border 1px solid #ffffff25 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Orbit/src/app/globals.css:3782 | implemented |
| UI-218 | Theme and contrast | .orbit-ship-control: border 1px solid #ffffff25 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Orbit/src/app/globals.css:3785 | implemented |
| UI-219 | Theme and contrast | .orbit-ship-control: background #11182770 → rgb(var(--ui-surface) / 0.4392156862745098) | Resonant-Orbit/src/app/globals.css:3785 | implemented |
| UI-220 | Theme and contrast | .world-shell.entertainment-mode .orbit-link: stroke rgba(255,255,255,.2) → rgb(var(--ui-fg) / .2) | Resonant-Orbit/src/app/entertainment.css:10 | implemented |
| UI-221 | Theme and contrast | .world-shell.entertainment-mode .destination-node .node-landmark: border-color rgba(255,255,255,.38) → rgb(var(--ui-fg) / .38) | Resonant-Orbit/src/app/entertainment.css:15 | implemented |
| UI-222 | Theme and contrast | .world-shell.entertainment-mode .destination-node:hover .node-landmark: background #f3f3f3 → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/entertainment.css:22 | implemented |
| UI-223 | Theme and contrast | .world-shell.entertainment-mode .destination-node:focus-visible .node-landmark: background #f3f3f3 → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/entertainment.css:22 | implemented |
| UI-224 | Theme and contrast | .world-shell.entertainment-mode .destination-node:hover .node-landmark: color #090909 → var(--ui-on-contrast) | Resonant-Orbit/src/app/entertainment.css:23 | implemented |
| UI-225 | Theme and contrast | .world-shell.entertainment-mode .destination-node:focus-visible .node-landmark: color #090909 → var(--ui-on-contrast) | Resonant-Orbit/src/app/entertainment.css:23 | implemented |
| UI-226 | Theme and contrast | .entertainment-copy .eyebrow: color #8f8f8f → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:45 | implemented |
| UI-227 | Theme and contrast | .entertainment-copy > p:last-child: color #9d9d9d → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:67 | implemented |
| UI-228 | Theme and contrast | .entertainment-switch-message: color #f6f6f6 → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/entertainment.css:84 | implemented |
| UI-229 | Theme and contrast | .entertainment-switch-message: border 1px solid rgba(255,255,255,.14) → 1px solid rgb(var(--ui-fg) / .14) | Resonant-Orbit/src/app/entertainment.css:86 | implemented |
| UI-230 | Theme and contrast | .ent-overlay-shell: background #070707 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/entertainment.css:121 | implemented |
| UI-231 | Theme and contrast | .ent-overlay-shell: border 1px solid rgba(255,255,255,.16) → 1px solid rgb(var(--ui-fg) / .16) | Resonant-Orbit/src/app/entertainment.css:122 | implemented |
| UI-232 | Theme and contrast | .ent-overlay-header p: color #858585 → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:137 | implemented |
| UI-233 | Theme and contrast | .ent-overlay-header > div > span: color #a8a8a8 → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:153 | implemented |
| UI-234 | Touch target | .ent-close: width 42px → 44px | Resonant-Orbit/src/app/entertainment.css:159 | implemented |
| UI-235 | Touch target | .ent-close: height 42px → 44px | Resonant-Orbit/src/app/entertainment.css:160 | implemented |
| UI-236 | Theme and contrast | .ent-close: border 1px solid rgba(255,255,255,.14) → 1px solid rgb(var(--ui-fg) / .14) | Resonant-Orbit/src/app/entertainment.css:161 | implemented |
| UI-237 | Theme and contrast | .ent-close: background #0d0d0d → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/entertainment.css:162 | implemented |
| UI-238 | Theme and contrast | .ent-close: color #ddd → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/entertainment.css:163 | implemented |
| UI-239 | Theme and contrast | .ent-close:hover: background #f2f2f2 → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/entertainment.css:171 | implemented |
| UI-240 | Theme and contrast | .ent-close:focus-visible: background #f2f2f2 → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/entertainment.css:171 | implemented |
| UI-241 | Theme and contrast | .ent-close:hover: color #090909 → var(--ui-on-contrast) | Resonant-Orbit/src/app/entertainment.css:172 | implemented |
| UI-242 | Theme and contrast | .ent-close:focus-visible: color #090909 → var(--ui-on-contrast) | Resonant-Orbit/src/app/entertainment.css:172 | implemented |
| UI-243 | Theme and contrast | .ent-game-hud span: border 1px solid rgba(255,255,255,.11) → 1px solid rgb(var(--ui-fg) / .11) | Resonant-Orbit/src/app/entertainment.css:188 | implemented |
| UI-244 | Theme and contrast | .ent-game-hud span: color #7e7e7e → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:189 | implemented |
| UI-245 | Theme and contrast | .ent-game-hud b: color #f0f0f0 → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/entertainment.css:195 | implemented |
| UI-246 | Theme and contrast | .ent-game-help: color #868686 → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:201 | implemented |
| UI-247 | Theme and contrast | .ent-game-actions button: border 1px solid rgba(255,255,255,.2) → 1px solid rgb(var(--ui-fg) / .2) | Resonant-Orbit/src/app/entertainment.css:215 | implemented |
| UI-248 | Theme and contrast | .ent-game-actions button: background #ececec → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/entertainment.css:216 | implemented |
| UI-249 | Theme and contrast | .ent-game-actions button: color #090909 → var(--ui-on-contrast) | Resonant-Orbit/src/app/entertainment.css:217 | implemented |
| UI-250 | Theme and contrast | .ent-overlay-footer: color #656565 → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:230 | implemented |
| UI-251 | Viewport fit | .flight-field: height min(350px, 43vh) → min(350px, 43dvh) | Resonant-Orbit/src/app/entertainment.css:238 | implemented |
| UI-252 | Theme and contrast | .gate-target: border 1px solid rgba(255,255,255,.2) → 1px solid rgb(var(--ui-fg) / .2) | Resonant-Orbit/src/app/entertainment.css:312 | implemented |
| UI-253 | Theme and contrast | .orbit-game-field: background radial-gradient(circle, rgba(255,255,255,.04), transparent 58%) → radial-gradient(circle, rgb(var(--ui-fg) / .04), transparent 58%) | Resonant-Orbit/src/app/entertainment.css:333 | implemented |
| UI-254 | Theme and contrast | .orbit-safe-band: border 16px solid rgba(255,255,255,.08) → 16px solid rgb(var(--ui-fg) / .08) | Resonant-Orbit/src/app/entertainment.css:343 | implemented |
| UI-255 | Theme and contrast | .orbit-game-core: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/entertainment.css:353 | implemented |
| UI-256 | Theme and contrast | .orbit-game-dot: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/entertainment.css:364 | implemented |
| UI-257 | Theme and contrast | .orbit-game-readout: color #777 → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:378 | implemented |
| UI-258 | Theme and contrast | .orbit-game-field.is-lost .orbit-game-dot: background #777 → rgb(var(--ui-fg) / .12) | Resonant-Orbit/src/app/entertainment.css:385 | implemented |
| UI-259 | Theme and contrast | .cipher-display: border 1px solid rgba(255,255,255,.1) → 1px solid rgb(var(--ui-fg) / .1) | Resonant-Orbit/src/app/entertainment.css:398 | implemented |
| UI-260 | Theme and contrast | .cipher-display: background #030303 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/entertainment.css:399 | implemented |
| UI-261 | Theme and contrast | .cipher-display span: border 1px solid rgba(255,255,255,.13) → 1px solid rgb(var(--ui-fg) / .13) | Resonant-Orbit/src/app/entertainment.css:407 | implemented |
| UI-262 | Theme and contrast | .cipher-display span: color #f5f5f5 → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/entertainment.css:408 | implemented |
| UI-263 | Theme and contrast | .cipher-display span.is-filled: background rgba(255,255,255,.07) → rgb(var(--ui-fg) / .07) | Resonant-Orbit/src/app/entertainment.css:414 | implemented |
| UI-264 | Theme and contrast | .cipher-feedback: color #8c8c8c → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:419 | implemented |
| UI-265 | Theme and contrast | .cipher-pad button: border 1px solid rgba(255,255,255,.13) → 1px solid rgb(var(--ui-fg) / .13) | Resonant-Orbit/src/app/entertainment.css:433 | implemented |
| UI-266 | Theme and contrast | .cipher-pad button: background #0b0b0b → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/entertainment.css:434 | implemented |
| UI-267 | Theme and contrast | .cipher-pad button: color #eaeaea → rgb(var(--ui-fg) / 1) | Resonant-Orbit/src/app/entertainment.css:435 | implemented |
| UI-268 | Theme and contrast | .cipher-pad button:hover:not(:disabled): background #ededed → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/entertainment.css:442 | implemented |
| UI-269 | Theme and contrast | .cipher-pad button:focus-visible:not(:disabled): background #ededed → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/entertainment.css:442 | implemented |
| UI-270 | Theme and contrast | .cipher-pad button:hover:not(:disabled): color #0a0a0a → var(--ui-on-contrast) | Resonant-Orbit/src/app/entertainment.css:443 | implemented |
| UI-271 | Theme and contrast | .cipher-pad button:focus-visible:not(:disabled): color #0a0a0a → var(--ui-on-contrast) | Resonant-Orbit/src/app/entertainment.css:443 | implemented |
| UI-272 | Viewport fit | .surge-pad: min-height min(360px, 44vh) → min(360px, 44dvh) | Resonant-Orbit/src/app/entertainment.css:452 | implemented |
| UI-273 | Theme and contrast | .surge-pad: border 1px solid rgba(255,255,255,.12) → 1px solid rgb(var(--ui-fg) / .12) | Resonant-Orbit/src/app/entertainment.css:458 | implemented |
| UI-274 | Theme and contrast | .surge-pad: background #030303 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/entertainment.css:459 | implemented |
| UI-275 | Theme and contrast | .surge-pad: color #858585 → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:460 | implemented |
| UI-276 | Theme and contrast | .surge-pad.is-go: background #f3f3f3 → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/src/app/entertainment.css:482 | implemented |
| UI-277 | Theme and contrast | .surge-pad.is-go: color #090909 → var(--ui-on-contrast) | Resonant-Orbit/src/app/entertainment.css:483 | implemented |
| UI-278 | Theme and contrast | .surge-pad.is-early: color #b9b9b9 → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:492 | implemented |
| UI-279 | Theme and contrast | .surge-pad.is-early: background #101010 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/src/app/entertainment.css:493 | implemented |
| UI-280 | Theme and contrast | .surge-ravin: color #b2b2b2 → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:499 | implemented |
| UI-281 | Theme and contrast | .entertainment-mode .destination-node .node-code: color #8b8b8b → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:505 | implemented |
| UI-282 | Theme and contrast | .entertainment-mode .destination-node .node-status: color #777 → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:509 | implemented |
| UI-283 | Theme and contrast | .entertainment-mode .orbit-shortcuts-label: color #9a9a9a → var(--ui-muted) | Resonant-Orbit/src/app/entertainment.css:513 | implemented |
| UI-284 | Touch target | .arrow-os-control: height 32px → 44px | Resonant-Orbit/public/arrow-shell.css:136 | implemented |
| UI-285 | Touch target | .arrow-os-control: min-height 32px → 44px | Resonant-Orbit/public/arrow-shell.css:137 | implemented |
| UI-286 | Theme and contrast | .arrow-os-control.is-disabled: color rgb(var(--arrow-os-fg) / .18) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:169 | implemented |
| UI-287 | Theme and contrast | .arrow-os-control:disabled: color rgb(var(--arrow-os-fg) / .18) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:169 | implemented |
| UI-288 | Theme and contrast | .arrow-os-control.is-disabled:hover: color rgb(var(--arrow-os-fg) / .18) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:180 | implemented |
| UI-289 | Theme and contrast | .arrow-os-control.is-disabled:focus-visible: color rgb(var(--arrow-os-fg) / .18) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:180 | implemented |
| UI-290 | Theme and contrast | .arrow-os-control:disabled:hover: color rgb(var(--arrow-os-fg) / .18) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:180 | implemented |
| UI-291 | Theme and contrast | .arrow-os-control:disabled:focus-visible: color rgb(var(--arrow-os-fg) / .18) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:180 | implemented |
| UI-292 | Theme and contrast | .arrow-os-module: color rgb(var(--arrow-os-fg) / .38) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:198 | implemented |
| UI-293 | Theme and contrast | .arrow-os-name: color rgb(var(--arrow-os-fg) / .4) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:216 | implemented |
| UI-294 | Theme and contrast | .arrow-os-panel-head span: color rgb(var(--arrow-os-fg) / .36) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:271 | implemented |
| UI-295 | Touch target | .arrow-os-panel-close: width 34px → 44px | Resonant-Orbit/public/arrow-shell.css:287 | implemented |
| UI-296 | Touch target | .arrow-os-row-delete: width 34px → 44px | Resonant-Orbit/public/arrow-shell.css:287 | implemented |
| UI-297 | Touch target | .arrow-os-panel-close: height 34px → 44px | Resonant-Orbit/public/arrow-shell.css:288 | implemented |
| UI-298 | Touch target | .arrow-os-row-delete: height 34px → 44px | Resonant-Orbit/public/arrow-shell.css:288 | implemented |
| UI-299 | Theme and contrast | .arrow-os-panel-close: color rgb(var(--arrow-os-fg) / .48) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:295 | implemented |
| UI-300 | Theme and contrast | .arrow-os-row-delete: color rgb(var(--arrow-os-fg) / .48) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:295 | implemented |
| UI-301 | Theme and contrast | .arrow-os-field > span: color rgb(var(--arrow-os-fg) / .42) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:333 | implemented |
| UI-302 | Theme and contrast | .arrow-os-section-label: color rgb(var(--arrow-os-fg) / .42) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:333 | implemented |
| UI-303 | Theme and contrast | .arrow-os-panel textarea::placeholder: color rgb(var(--arrow-os-fg) / .28) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:367 | implemented |
| UI-304 | Theme and contrast | .arrow-os-panel input::placeholder: color rgb(var(--arrow-os-fg) / .28) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:367 | implemented |
| UI-305 | Theme and contrast | .arrow-os-panel-foot: color rgb(var(--arrow-os-fg) / .34) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:382 | implemented |
| UI-306 | Touch target | .arrow-os-inline-form button: min-height 40px → 44px | Resonant-Orbit/public/arrow-shell.css:405 | implemented |
| UI-307 | Touch target | .arrow-os-link-form button: min-height 40px → 44px | Resonant-Orbit/public/arrow-shell.css:405 | implemented |
| UI-308 | Touch target | .arrow-os-calendar-form button: min-height 40px → 44px | Resonant-Orbit/public/arrow-shell.css:405 | implemented |
| UI-309 | Touch target | .arrow-os-focus-actions button: min-height 40px → 44px | Resonant-Orbit/public/arrow-shell.css:405 | implemented |
| UI-310 | Touch target | .arrow-os-presets button: min-height 40px → 44px | Resonant-Orbit/public/arrow-shell.css:405 | implemented |
| UI-311 | Touch target | .arrow-os-segmented button: min-height 40px → 44px | Resonant-Orbit/public/arrow-shell.css:405 | implemented |
| UI-312 | Touch target | .arrow-os-settings-actions button: min-height 40px → 44px | Resonant-Orbit/public/arrow-shell.css:405 | implemented |
| UI-313 | Theme and contrast | .arrow-os-list-row span: color rgb(var(--arrow-os-fg) / .4) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:489 | implemented |
| UI-314 | Theme and contrast | .arrow-os-list-row.is-done label span: color rgb(var(--arrow-os-fg) / .32) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:501 | implemented |
| UI-315 | Theme and contrast | .arrow-os-empty: color rgb(var(--arrow-os-fg) / .34) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:509 | implemented |
| UI-316 | Theme and contrast | .arrow-os-focus-label: color rgb(var(--arrow-os-fg) / .34) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:522 | implemented |
| UI-317 | Touch target | .arrow-os-accents button: min-height 42px → 44px | Resonant-Orbit/public/arrow-shell.css:587 | implemented |
| UI-318 | Theme and contrast | .arrow-os-settings-card > span: color rgb(var(--arrow-os-fg) / .38) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:623 | implemented |
| UI-319 | Theme and contrast | .arrow-os-settings-card small: color rgb(var(--arrow-os-fg) / .38) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:641 | implemented |
| UI-320 | Theme and contrast | .arrow-os-handoff: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Orbit/public/arrow-shell.css:689 | implemented |
| UI-321 | Theme and contrast | .arrow-os-handoff p: color rgba(255,255,255,.52) → var(--ui-muted) | Resonant-Orbit/public/arrow-shell.css:701 | implemented |
| UI-322 | Theme and contrast | .arrow-os-gravity-vignette: background radial-gradient(circle at center, transparent 0 23%, rgba(0,0,0,.08) 38%, rgba(0,0,0,.62) 68%, #000 100%) → radial-gradient(circle at center, transparent 0 23%, rgba(0,0,0,.08) 38%, rgba(0,0,0,.62) 68%, rgb(var(--ui-surface) / 1) 100%) | Resonant-Orbit/public/arrow-shell.css:769 | implemented |
| UI-323 | Theme and contrast | .arrow-os-blackhole-halo: background radial-gradient(circle,       transparent 0 12%,       rgba(255,255,255,.035) 13.5%,       rgba(255,255,255,.2) 16.5%,       rgba(255,255,255,.075) 20.5%,       rgba(255,255,255,.018) 31%,       transparent 58%) → radial-gradient(circle,       transparent 0 12%,       rgb(var(--ui-fg) / .035) 13.5%,       rgb(var(--ui-fg) / .2) 16.5%,       rgb(var(--ui-fg) / .075) 20.5%,       rgb(var(--ui-fg) / .018) 31%,       transparent 58%) | Resonant-Orbit/public/arrow-shell.css:793 | implemented |
| UI-324 | Theme and contrast | .arrow-os-blackhole-disk.disk-main: background linear-gradient(90deg,       transparent 0 3%,       rgba(255,255,255,.12) 9%,       rgba(255,255,255,.88) 24%,       #fff 42%,       rgba(255,255,255,.96) 55%,       rgba(255,255,255,.54) 76%,       rgba(255,255,255,.08) 92%,       transparent 100%) → linear-gradient(90deg,       transparent 0 3%,       rgb(var(--ui-fg) / .12) 9%,       rgb(var(--ui-fg) / .88) 24%,       rgb(var(--ui-contrast) / 1) 42%,       rgb(var(--ui-fg) / .96) 55%,       rgb(var(--ui-fg) / .54) 76%,       rgb(var(--ui-fg) / .08) 92%,       transparent 100%) | Resonant-Orbit/public/arrow-shell.css:821 | implemented |
| UI-325 | Theme and contrast | .arrow-os-blackhole-disk.disk-far: border 5px solid rgba(255,255,255,.56) → 5px solid rgb(var(--ui-fg) / .56) | Resonant-Orbit/public/arrow-shell.css:844 | implemented |
| UI-326 | Theme and contrast | .arrow-os-blackhole-photon-ring: border 4px solid rgba(255,255,255,.92) → 4px solid rgb(var(--ui-fg) / .92) | Resonant-Orbit/public/arrow-shell.css:882 | implemented |
| UI-327 | Theme and contrast | .arrow-os-blackhole-core: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/public/arrow-shell.css:899 | implemented |
| UI-328 | Theme and contrast | 100%: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/public/arrow-shell.css:916 | implemented |
| UI-329 | Theme and contrast | .arrow-os-center-arrival: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/public/arrow-shell.css:984 | implemented |
| UI-330 | Theme and contrast | .arrow-os-center-arrival-core: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Orbit/public/arrow-shell.css:1002 | implemented |
| UI-331 | Theme and contrast | .arrow-os-center-shock: border 2px solid rgba(255,255,255,.72) → 2px solid rgb(var(--ui-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:1015 | implemented |
| UI-332 | Theme and contrast | 0%: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/public/arrow-shell.css:1033 | implemented |
| UI-333 | Theme and contrast | 30%: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Orbit/public/arrow-shell.css:1033 | implemented |
| UI-334 | Touch target | .arrow-os-control: width 32px → 44px | Resonant-Orbit/public/arrow-shell.css:1068 | implemented |
| UI-335 | Theme and contrast | .arrow-os-owner-note span: color rgb(var(--arrow-os-fg) / .45) → rgb(var(--arrow-os-fg) / .72) | Resonant-Orbit/public/arrow-shell.css:1265 | implemented |
| UI-336 | Touch target | .arrow-os-note-form button: min-height 36px → 44px | Resonant-Orbit/public/arrow-shell.css:1415 | implemented |
| UI-337 | Viewport fit | .waypoint-app: min-height 100vh → 100dvh | Resonant-Waypoint/src/app/globals.css:29 | implemented |
| UI-338 | Theme and contrast | .waypoint-app: background radial-gradient(circle at 78% 6%, rgba(255,255,255,.055), transparent 32%),     radial-gradient(circle at 36% 100%, rgba(255,255,255,.035), transparent 35%),     #050607 → radial-gradient(circle at 78% 6%, rgb(var(--ui-fg) / .055), transparent 32%),     radial-gradient(circle at 36% 100%, rgb(var(--ui-fg) / .035), transparent 35%),     rgb(var(--ui-surface) / 1) | Resonant-Waypoint/src/app/globals.css:34 | implemented |
| UI-339 | Viewport fit | .sidebar: height 100vh → 100dvh | Resonant-Waypoint/src/app/globals.css:68 | implemented |
| UI-340 | Theme and contrast | .brand-mark: background rgba(255,255,255,.035) → rgb(var(--ui-fg) / .035) | Resonant-Waypoint/src/app/globals.css:81 | implemented |
| UI-341 | Motion isolation | .nav-item: transition .18s ease → color .18s ease, background-color .18s ease, border-color .18s ease, opacity .18s ease, transform .18s ease | Resonant-Waypoint/src/app/globals.css:93 | implemented |
| UI-342 | Theme and contrast | .nav-item:hover: background rgba(255,255,255,.035) → rgb(var(--ui-fg) / .035) | Resonant-Waypoint/src/app/globals.css:95 | implemented |
| UI-343 | Theme and contrast | .nav-item.active: background rgba(255,255,255,.075) → rgb(var(--ui-fg) / .075) | Resonant-Waypoint/src/app/globals.css:98 | implemented |
| UI-344 | Theme and contrast | .nav-badge: color #050607 → var(--ui-on-contrast) | Resonant-Waypoint/src/app/globals.css:104 | implemented |
| UI-345 | Theme and contrast | .orbit-dot: border 1px solid rgba(255,255,255,.7) → 1px solid rgb(var(--ui-fg) / .7) | Resonant-Waypoint/src/app/globals.css:113 | implemented |
| UI-346 | Viewport fit | .content-shell: height 100vh → 100dvh | Resonant-Waypoint/src/app/globals.css:116 | implemented |
| UI-347 | Theme and contrast | .icon-button: background rgba(255,255,255,.045) → rgb(var(--ui-fg) / .045) | Resonant-Waypoint/src/app/globals.css:127 | implemented |
| UI-348 | Theme and contrast | .ravin-chip: background rgba(255,255,255,.045) → rgb(var(--ui-fg) / .045) | Resonant-Waypoint/src/app/globals.css:127 | implemented |
| UI-349 | Theme and contrast | .primary-button: background rgba(255,255,255,.045) → rgb(var(--ui-fg) / .045) | Resonant-Waypoint/src/app/globals.css:127 | implemented |
| UI-350 | Motion isolation | .icon-button: transition .18s ease → color .18s ease, background-color .18s ease, border-color .18s ease, opacity .18s ease, transform .18s ease | Resonant-Waypoint/src/app/globals.css:128 | implemented |
| UI-351 | Motion isolation | .ravin-chip: transition .18s ease → color .18s ease, background-color .18s ease, border-color .18s ease, opacity .18s ease, transform .18s ease | Resonant-Waypoint/src/app/globals.css:128 | implemented |
| UI-352 | Motion isolation | .primary-button: transition .18s ease → color .18s ease, background-color .18s ease, border-color .18s ease, opacity .18s ease, transform .18s ease | Resonant-Waypoint/src/app/globals.css:128 | implemented |
| UI-353 | Touch target | .icon-button: width 40px → 44px | Resonant-Waypoint/src/app/globals.css:130 | implemented |
| UI-354 | Touch target | .icon-button: height 40px → 44px | Resonant-Waypoint/src/app/globals.css:130 | implemented |
| UI-355 | Theme and contrast | .icon-button:hover: background rgba(255,255,255,.085) → rgb(var(--ui-fg) / .085) | Resonant-Waypoint/src/app/globals.css:132 | implemented |
| UI-356 | Theme and contrast | .ravin-chip:hover: background rgba(255,255,255,.085) → rgb(var(--ui-fg) / .085) | Resonant-Waypoint/src/app/globals.css:132 | implemented |
| UI-357 | Theme and contrast | .panel: background linear-gradient(145deg, rgba(255,255,255,.06), rgba(255,255,255,.028)) → linear-gradient(145deg, rgb(var(--ui-fg) / .06), rgb(var(--ui-fg) / .028)) | Resonant-Waypoint/src/app/globals.css:140 | implemented |
| UI-358 | Theme and contrast | .hero-panel: background linear-gradient(145deg, rgba(255,255,255,.06), rgba(255,255,255,.028)) → linear-gradient(145deg, rgb(var(--ui-fg) / .06), rgb(var(--ui-fg) / .028)) | Resonant-Waypoint/src/app/globals.css:140 | implemented |
| UI-359 | Theme and contrast | .hero-panel::after: border 1px solid rgba(255,255,255,.06) → 1px solid rgb(var(--ui-fg) / .06) | Resonant-Waypoint/src/app/globals.css:152 | implemented |
| UI-360 | Theme and contrast | .progress-track: stroke rgba(255,255,255,.09) → rgb(var(--ui-fg) / .09) | Resonant-Waypoint/src/app/globals.css:165 | implemented |
| UI-361 | Theme and contrast | .task-check: border 1px solid rgba(255,255,255,.23) → 1px solid rgb(var(--ui-fg) / .23) | Resonant-Waypoint/src/app/globals.css:186 | implemented |
| UI-362 | Theme and contrast | .brain-textarea:focus: border-color rgba(255,255,255,.22) → rgb(var(--ui-fg) / .22) | Resonant-Waypoint/src/app/globals.css:216 | implemented |
| UI-363 | Theme and contrast | .brain-textarea::placeholder: color rgba(255,255,255,.2) → var(--ui-muted) | Resonant-Waypoint/src/app/globals.css:217 | implemented |
| UI-364 | Theme and contrast | .primary-button: color #050607 → var(--ui-on-contrast) | Resonant-Waypoint/src/app/globals.css:220 | implemented |
| UI-365 | Theme and contrast | .capture-row: background rgba(255,255,255,.018) → rgb(var(--ui-fg) / .018) | Resonant-Waypoint/src/app/globals.css:229 | implemented |
| UI-366 | Theme and contrast | .capture-row.selected: background rgba(255,255,255,.05) → rgb(var(--ui-fg) / .05) | Resonant-Waypoint/src/app/globals.css:231 | implemented |
| UI-367 | Theme and contrast | .type-dot: background rgba(255,255,255,.35) → rgb(var(--ui-fg) / .35) | Resonant-Waypoint/src/app/globals.css:232 | implemented |
| UI-368 | Theme and contrast | .mini-progress: background rgba(255,255,255,.07) → rgb(var(--ui-fg) / .07) | Resonant-Waypoint/src/app/globals.css:245 | implemented |
| UI-369 | Theme and contrast | .time-block: background rgba(255,255,255,.075) → rgb(var(--ui-fg) / .075) | Resonant-Waypoint/src/app/globals.css:259 | implemented |
| UI-370 | Theme and contrast | .time-block.muted: background rgba(255,255,255,.03) → rgb(var(--ui-fg) / .03) | Resonant-Waypoint/src/app/globals.css:261 | implemented |
| UI-371 | Viewport fit | .content-shell: min-height 100vh → 100dvh | Resonant-Waypoint/src/app/globals.css:310 | implemented |
| UI-372 | Theme and contrast | .reasoning-next::after: border 1px solid rgba(255,255,255,.055) → 1px solid rgb(var(--ui-fg) / .055) | Resonant-Waypoint/src/app/globals.css:379 | implemented |
| UI-373 | Theme and contrast | .signal-card: border 1px solid rgba(255,255,255,.07) → 1px solid rgb(var(--ui-fg) / .07) | Resonant-Waypoint/src/app/globals.css:403 | implemented |
| UI-374 | Theme and contrast | .signal-card: background rgba(255,255,255,.018) → rgb(var(--ui-fg) / .018) | Resonant-Waypoint/src/app/globals.css:405 | implemented |
| UI-375 | Theme and contrast | .signal-kind: border 1px solid rgba(255,255,255,.1) → 1px solid rgb(var(--ui-fg) / .1) | Resonant-Waypoint/src/app/globals.css:412 | implemented |
| UI-376 | Theme and contrast | .question-row: background rgba(255,255,255,.02) → rgb(var(--ui-fg) / .02) | Resonant-Waypoint/src/app/globals.css:454 | implemented |
| UI-377 | Theme and contrast | .question-row > span: border 1px solid rgba(255,255,255,.16) → 1px solid rgb(var(--ui-fg) / .16) | Resonant-Waypoint/src/app/globals.css:461 | implemented |
| UI-378 | Theme and contrast | .waypoint-sync-state: border 1px solid rgba(255,255,255,.08) → 1px solid rgb(var(--ui-fg) / .08) | Resonant-Waypoint/src/app/globals.css:497 | implemented |
| UI-379 | Theme and contrast | .waypoint-sync-state: background rgba(255,255,255,.035) → rgb(var(--ui-fg) / .035) | Resonant-Waypoint/src/app/globals.css:499 | implemented |
| UI-380 | Theme and contrast | .waypoint-sync-state: color var(--muted, #8f8f98) → var(--muted, var(--ui-muted)) | Resonant-Waypoint/src/app/globals.css:500 | implemented |
| UI-381 | Theme and contrast | .waypoint-sync-state button: border 1px solid rgba(255,255,255,.11) → 1px solid rgb(var(--ui-fg) / .11) | Resonant-Waypoint/src/app/globals.css:520 | implemented |
| UI-382 | Theme and contrast | .row-action: border 1px solid rgba(255,255,255,.11) → 1px solid rgb(var(--ui-fg) / .11) | Resonant-Waypoint/src/app/globals.css:520 | implemented |
| UI-383 | Theme and contrast | .waypoint-sync-state button: background rgba(255,255,255,.035) → rgb(var(--ui-fg) / .035) | Resonant-Waypoint/src/app/globals.css:521 | implemented |
| UI-384 | Theme and contrast | .row-action: background rgba(255,255,255,.035) → rgb(var(--ui-fg) / .035) | Resonant-Waypoint/src/app/globals.css:521 | implemented |
| UI-385 | Theme and contrast | .waypoint-sync-state button:hover: border-color rgba(255,255,255,.24) → rgb(var(--ui-fg) / .24) | Resonant-Waypoint/src/app/globals.css:534 | implemented |
| UI-386 | Theme and contrast | .row-action:hover: border-color rgba(255,255,255,.24) → rgb(var(--ui-fg) / .24) | Resonant-Waypoint/src/app/globals.css:534 | implemented |
| UI-387 | Theme and contrast | .waypoint-sync-state button:hover: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Waypoint/src/app/globals.css:535 | implemented |
| UI-388 | Theme and contrast | .row-action:hover: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Waypoint/src/app/globals.css:535 | implemented |
| UI-389 | Theme and contrast | .waypoint-sync-state button:hover: background rgba(255,255,255,.065) → rgb(var(--ui-fg) / .065) | Resonant-Waypoint/src/app/globals.css:536 | implemented |
| UI-390 | Theme and contrast | .row-action:hover: background rgba(255,255,255,.065) → rgb(var(--ui-fg) / .065) | Resonant-Waypoint/src/app/globals.css:536 | implemented |
| UI-391 | Theme and contrast | .planning-control-bar button: background var(--surface,#161a23) → var(--surface,rgb(var(--ui-surface) / 1)) | Resonant-Waypoint/src/app/globals.css:596 | implemented |
| UI-392 | Theme and contrast | .calendar-week-controls button: background var(--surface,#161a23) → var(--surface,rgb(var(--ui-surface) / 1)) | Resonant-Waypoint/src/app/globals.css:596 | implemented |
| UI-393 | Theme and contrast | .planning-editor button: background var(--surface,#161a23) → var(--surface,rgb(var(--ui-surface) / 1)) | Resonant-Waypoint/src/app/globals.css:596 | implemented |
| UI-394 | Theme and contrast | .planning-control-bar button: border 1px solid var(--border,#747f932b) → 1px solid var(--border,rgb(var(--ui-fg) / .18)) | Resonant-Waypoint/src/app/globals.css:596 | implemented |
| UI-395 | Theme and contrast | .calendar-week-controls button: border 1px solid var(--border,#747f932b) → 1px solid var(--border,rgb(var(--ui-fg) / .18)) | Resonant-Waypoint/src/app/globals.css:596 | implemented |
| UI-396 | Theme and contrast | .planning-editor button: border 1px solid var(--border,#747f932b) → 1px solid var(--border,rgb(var(--ui-fg) / .18)) | Resonant-Waypoint/src/app/globals.css:596 | implemented |
| UI-397 | Theme and contrast | .planning-editor: border 1px solid #747f9330 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Waypoint/src/app/globals.css:597 | implemented |
| UI-398 | Theme and contrast | .planning-editor: background var(--surface,#161a23) → var(--surface,rgb(var(--ui-surface) / 1)) | Resonant-Waypoint/src/app/globals.css:597 | implemented |
| UI-399 | Theme and contrast | .planning-editor :is(input,select): border 1px solid #747f9330 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Waypoint/src/app/globals.css:600 | implemented |
| UI-400 | Theme and contrast | .schedule-preview label: border 1px solid var(--line,#ffffff20) → 1px solid var(--line,rgb(var(--ui-fg) / .18)) | Resonant-Waypoint/src/app/globals.css:611 | implemented |
| UI-401 | Theme and contrast | :is(.primary-button,.nav-plus): background var(--arrow-accent-color,#fff) → var(--arrow-accent-color,rgb(var(--ui-contrast) / 1)) | Resonant-Waypoint/src/app/globals.css:647 | implemented |
| UI-402 | Theme and contrast | :is(.primary-button,.nav-plus): color var(--arrow-accent-on,#111) → var(--arrow-accent-on,var(--ui-on-contrast)) | Resonant-Waypoint/src/app/globals.css:647 | implemented |
| UI-403 | Viewport fit | body: min-height 100vh → 100dvh | Resonant-Field/apps/explorer/styles.css:42 | implemented |
| UI-404 | Viewport fit | .app-shell: min-height 100vh → 100dvh | Resonant-Field/apps/explorer/styles.css:76 | implemented |
| UI-405 | Touch target | .icon-action: height 32px → 44px | Resonant-Field/apps/explorer/styles.css:136 | implemented |
| UI-406 | Touch target | .square-action: height 32px → 44px | Resonant-Field/apps/explorer/styles.css:136 | implemented |
| UI-407 | Touch target | .square-action: width 32px → 44px | Resonant-Field/apps/explorer/styles.css:148 | implemented |
| UI-408 | Touch target | .toolbar-buttons button: height 28px → 44px | Resonant-Field/apps/explorer/styles.css:368 | implemented |
| UI-409 | Touch target | .toolbar-buttons button: min-width 28px → 44px | Resonant-Field/apps/explorer/styles.css:369 | implemented |
| UI-410 | Touch target | .dialog-close: width 29px → 44px | Resonant-Field/apps/explorer/styles.css:636 | implemented |
| UI-411 | Touch target | .dialog-close: height 29px → 44px | Resonant-Field/apps/explorer/styles.css:637 | implemented |
| UI-412 | Touch target | .inspector-close: width 30px → 44px | Resonant-Field/apps/explorer/styles.css:810 | implemented |
| UI-413 | Touch target | .inspector-close: height 30px → 44px | Resonant-Field/apps/explorer/styles.css:811 | implemented |
| UI-414 | Touch target | .account-action: height 34px → 44px | Resonant-Field/apps/explorer/styles.css:840 | implemented |
| UI-415 | Touch target | .build-field-button: height 38px → 44px | Resonant-Field/apps/explorer/styles.css:1011 | implemented |
| UI-416 | Touch target | .build-field-overlay.building .build-field-button: width 34px → 44px | Resonant-Field/apps/explorer/styles.css:1031 | implemented |
| UI-417 | Touch target | .build-field-overlay.building .build-field-button: height 34px → 44px | Resonant-Field/apps/explorer/styles.css:1032 | implemented |
| UI-418 | Theme and contrast | .arrow-system-island: border 1px solid rgba(255,255,255,.08) → 1px solid rgb(var(--ui-fg) / .08) | Resonant-Field/apps/explorer/styles.css:1097 | implemented |
| UI-419 | Touch target | .arrow-system-control: height 32px → 44px | Resonant-Field/apps/explorer/styles.css:1195 | implemented |
| UI-420 | Touch target | .arrow-system-icon-control: height 32px → 44px | Resonant-Field/apps/explorer/styles.css:1195 | implemented |
| UI-421 | Touch target | .arrow-system-control: min-height 32px → 44px | Resonant-Field/apps/explorer/styles.css:1196 | implemented |
| UI-422 | Touch target | .arrow-system-icon-control: min-height 32px → 44px | Resonant-Field/apps/explorer/styles.css:1196 | implemented |
| UI-423 | Touch target | .arrow-system-icon-control: width 32px → 44px | Resonant-Field/apps/explorer/styles.css:1233 | implemented |
| UI-424 | Theme and contrast | .arrow-system-launch: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Field/apps/explorer/styles.css:1271 | implemented |
| UI-425 | Theme and contrast | .arrow-system-launch: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Field/apps/explorer/styles.css:1272 | implemented |
| UI-426 | Theme and contrast | .arrow-system-launch-craft span: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Field/apps/explorer/styles.css:1297 | implemented |
| UI-427 | Theme and contrast | .arrow-system-launch-ring: border 1px solid rgba(255,255,255,.22) → 1px solid rgb(var(--ui-fg) / .22) | Resonant-Field/apps/explorer/styles.css:1305 | implemented |
| UI-428 | Theme and contrast | .arrow-system-launch p: color rgba(255,255,255,.52) → var(--ui-muted) | Resonant-Field/apps/explorer/styles.css:1324 | implemented |
| UI-429 | Touch target | .arrow-system-control: width 32px → 44px | Resonant-Field/apps/explorer/styles.css:1360 | implemented |
| UI-430 | Theme and contrast | .arrow-system-arrival: background #000 → rgb(var(--ui-surface) / 1) | Resonant-Field/apps/explorer/styles.css:1451 | implemented |
| UI-431 | Theme and contrast | .arrow-system-arrival: color #fff → rgb(var(--ui-fg) / 1) | Resonant-Field/apps/explorer/styles.css:1452 | implemented |
| UI-432 | Theme and contrast | .arrow-system-arrival-craft span: background #fff → rgb(var(--ui-contrast) / 1) | Resonant-Field/apps/explorer/styles.css:1477 | implemented |
| UI-433 | Theme and contrast | .arrow-system-arrival-ring: border 1px solid rgba(255,255,255,.22) → 1px solid rgb(var(--ui-fg) / .22) | Resonant-Field/apps/explorer/styles.css:1485 | implemented |
| UI-434 | Theme and contrast | .arrow-system-arrival p: color rgba(255,255,255,.52) → var(--ui-muted) | Resonant-Field/apps/explorer/styles.css:1504 | implemented |
| UI-435 | Theme and contrast | .atlas-view-switch button: border 1px solid #80889835 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Field/apps/explorer/styles.css:1548 | implemented |
| UI-436 | Theme and contrast | .atlas-list-pagination button: border 1px solid #80889835 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Field/apps/explorer/styles.css:1548 | implemented |
| UI-437 | Theme and contrast | .atlas-view-switch button: background var(--surface,#15171ce8) → var(--surface,rgb(var(--ui-surface) / 0.9098039215686274)) | Resonant-Field/apps/explorer/styles.css:1548 | implemented |
| UI-438 | Theme and contrast | .atlas-list-pagination button: background var(--surface,#15171ce8) → var(--surface,rgb(var(--ui-surface) / 0.9098039215686274)) | Resonant-Field/apps/explorer/styles.css:1548 | implemented |
| UI-439 | Theme and contrast | .atlas-list-item: border 1px solid #80889835 → 1px solid rgb(var(--ui-fg) / .18) | Resonant-Field/apps/explorer/styles.css:1552 | implemented |
| UI-440 | Theme and contrast | .atlas-list-item: background var(--surface,#15171c) → var(--surface,rgb(var(--ui-surface) / 1)) | Resonant-Field/apps/explorer/styles.css:1552 | implemented |
| UI-441 | Theme and contrast | html:not(.dark) :is(.atlas-list-item,.atlas-view-switch button,.atlas-list-pagination button): background #fff → rgb(var(--ui-surface) / 1) | Resonant-Field/apps/explorer/styles.css:1557 | implemented |
| UI-442 | Theme and contrast | body: background radial-gradient(circle at 72% 12%, rgba(255,255,255,.025), transparent 24rem),     rgb(var(--canvas)) → radial-gradient(circle at 72% 12%, rgb(var(--ui-fg) / .025), transparent 24rem),     rgb(var(--canvas)) | Project-R.A.V.I.N.-1.1/ravin/public/resonant-shell.css:26 | implemented |
| UI-443 | Theme and contrast | .ravin-brand-mark::after: border 1px solid rgba(255,255,255,.18) → 1px solid rgb(var(--ui-fg) / .18) | Project-R.A.V.I.N.-1.1/ravin/public/resonant-shell.css:68 | implemented |
| UI-444 | Touch target | .ravin-sidebar-action: min-height 40px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/resonant-shell.css:77 | implemented |
| UI-445 | Touch target | .ravin-nav-item: min-height 40px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/resonant-shell.css:77 | implemented |
| UI-446 | Touch target | .ravin-icon-button: width 34px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/resonant-shell.css:139 | implemented |
| UI-447 | Touch target | .ravin-icon-button: height 34px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/resonant-shell.css:139 | implemented |
| UI-448 | Touch target | .ravin-icon-button: width 32px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/resonant-polish.css:368 | implemented |
| UI-449 | Touch target | .ravin-icon-button: height 32px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/resonant-polish.css:368 | implemented |
| UI-450 | Touch target | .ravin-mode-switch button: min-height 34px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/mobile-shell.css:65 | implemented |
| UI-451 | Touch target | .ravin-icon-button: min-width 40px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/mobile-shell.css:67 | implemented |
| UI-452 | Touch target | .ravin-icon-button: min-height 40px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/mobile-shell.css:67 | implemented |
| UI-453 | Touch target | .ravin-header-right .ravin-icon-button: width 38px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/mobile-shell.css:114 | implemented |
| UI-454 | Touch target | .ravin-header-right .ravin-icon-button: min-width 38px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/mobile-shell.css:114 | implemented |
| UI-455 | Touch target | .ravin-attachment-chip button: width 21px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-v02.css:111 | implemented |
| UI-456 | Touch target | .ravin-attachment-chip button: height 21px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-v02.css:111 | implemented |
| UI-457 | Touch target | .ravin-environment-button: height 30px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-v02.css:117 | implemented |
| UI-458 | Touch target | .ravin-v02-drawer-close: width 32px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-v02.css:158 | implemented |
| UI-459 | Touch target | .ravin-v02-drawer-close: height 32px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-v02.css:158 | implemented |
| UI-460 | Touch target | .ravin-memory-add button: height 34px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-v02.css:177 | implemented |
| UI-461 | Touch target | .ravin-environment-button: min-width 36px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-v02.css:209 | implemented |
| UI-462 | Touch target | .ravin-environment-button: width 36px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-v02.css:209 | implemented |
| UI-463 | Touch target | .ravin-file-actions button: height 28px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-files-ui.css:101 | implemented |
| UI-464 | Touch target | .ravin-sidebar-action.primary: min-height 39px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-clean.css:83 | implemented |
| UI-465 | Touch target | .ravin-clean-nav-item: min-height 37px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-clean.css:99 | implemented |
| UI-466 | Touch target | .ravin-experience-grid button: min-height 31px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-clean.css:303 | implemented |
| UI-467 | Theme and contrast | .ravin-accent-swatch span: border 1px solid rgba(255,255,255,.12) → 1px solid rgb(var(--ui-fg) / .12) | Project-R.A.V.I.N.-1.1/ravin/public/ravin-clean.css:327 | implemented |
| UI-468 | Theme and contrast | .ravin-accent-swatch[data-ravin-accent-option="mono"] span: background linear-gradient(135deg,#f3f3f5,#777780) → linear-gradient(135deg,rgb(var(--ui-contrast) / 1),rgb(var(--ui-fg) / .12)) | Project-R.A.V.I.N.-1.1/ravin/public/ravin-clean.css:328 | implemented |
| UI-469 | Viewport fit | .ravin-settings-popover: max-height calc(100vh - 76px) → calc(100dvh - 76px) | Project-R.A.V.I.N.-1.1/ravin/public/ravin-relay-experience.css:70 | implemented |
| UI-470 | Touch target | .ravin-settings-popover > button: min-height 38px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-relay-experience.css:80 | implemented |
| UI-471 | Viewport fit | .ravin-settings-popover: max-height calc(100vh - 68px) → calc(100dvh - 68px) | Project-R.A.V.I.N.-1.1/ravin/public/ravin-relay-experience.css:343 | implemented |
| UI-472 | Viewport fit | .ravin-settings-popover: max-height min(760px, calc(100vh - 24px)) → min(760px, calc(100dvh - 24px)) | Project-R.A.V.I.N.-1.1/ravin/public/ravin-product.css:174 | implemented |
| UI-473 | Touch target | .ravin-delete-actions button: min-height 34px → 44px | Project-R.A.V.I.N.-1.1/ravin/public/ravin-product.css:215 | implemented |
| UI-474 | Viewport fit | .ravin-settings-popover: max-height calc(100vh - 18px) → calc(100dvh - 18px) | Project-R.A.V.I.N.-1.1/ravin/public/ravin-product.css:288 | implemented |
| UI-475 | Theme and contrast | html[data-arrow-ravin="true"] #ravinApp: background var(--ravin-bg,#090b10) → var(--ravin-bg,rgb(var(--ui-surface) / 1)) | Project-R.A.V.I.N.-1.1/ravin/public/arrow-ravin.css:3 | implemented |
| UI-476 | Theme and contrast | html[data-arrow-ravin="true"][data-arrow-experience="glass"] #ravinApp: background radial-gradient(ellipse at top left,rgba(var(--arrow-accent-rgb,136,159,229),.22),var(--ravin-bg,#090b10) 65%) → radial-gradient(ellipse at top left,rgba(var(--arrow-accent-rgb,136,159,229),.22),var(--ravin-bg,rgb(var(--ui-surface) / 1)) 65%) | Project-R.A.V.I.N.-1.1/ravin/public/arrow-ravin.css:28 | implemented |
| UI-477 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | Resonant-Waypoint/src/components/waypoint-shell.tsx:417 | implemented |
| UI-478 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | Resonant-Waypoint/src/components/waypoint-shell.tsx:469 | implemented |
| UI-479 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | Resonant-Waypoint/src/components/waypoint-shell.tsx:472 | implemented |
| UI-480 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | Resonant-Waypoint/src/components/waypoint-shell.tsx:594 | implemented |
| UI-481 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | Resonant-Waypoint/src/components/waypoint-shell.tsx:614 | implemented |
| UI-482 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | Resonant-Waypoint/src/components/waypoint-shell.tsx:706 | implemented |
| UI-483 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | Resonant-Waypoint/src/components/waypoint-shell.tsx:821 | implemented |
| UI-484 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | Resonant-Waypoint/src/components/waypoint-shell.tsx:850 | implemented |
| UI-485 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | Resonant-Waypoint/src/components/waypoint-shell.tsx:931 | implemented |
| UI-486 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/app/(app)/profile/page.tsx:72 | implemented |
| UI-487 | Form behavior | Make the button type explicit (submit) to keep click actions from submitting enclosing forms | relay/relay/src/app/login/page.tsx:72 | implemented |
| UI-488 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/app/login/page.tsx:75 | implemented |
| UI-489 | Form behavior | Make the button type explicit (submit) to keep click actions from submitting enclosing forms | relay/relay/src/components/account-access.tsx:47 | implemented |
| UI-490 | Form behavior | Make the button type explicit (submit) to keep click actions from submitting enclosing forms | relay/relay/src/components/account-access.tsx:48 | implemented |
| UI-491 | Form behavior | Make the button type explicit (submit) to keep click actions from submitting enclosing forms | relay/relay/src/components/account-access.tsx:49 | implemented |
| UI-492 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/beta-intro.tsx:180 | implemented |
| UI-493 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/beta-intro.tsx:181 | implemented |
| UI-494 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/chats/new-chat-dialog.tsx:86 | implemented |
| UI-495 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/chats/new-chat-dialog.tsx:124 | implemented |
| UI-496 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/chats/new-chat-dialog.tsx:169 | implemented |
| UI-497 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/contacts/requests-list.tsx:67 | implemented |
| UI-498 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/contacts/requests-list.tsx:74 | implemented |
| UI-499 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/contacts/requests-list.tsx:97 | implemented |
| UI-500 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/google/connect-button.tsx:33 | implemented |
| UI-501 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/google/disconnect-button.tsx:10 | implemented |
| UI-502 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/planner/new-plan-dialog.tsx:99 | implemented |
| UI-503 | Form behavior | Make the button type explicit (button) to keep click actions from submitting enclosing forms | relay/relay/src/components/profile/sign-out-button.tsx:13 | implemented |
