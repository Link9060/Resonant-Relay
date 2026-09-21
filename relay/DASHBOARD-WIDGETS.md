# Dashboard widget behavior

Relay dashboard widgets keep their configured grid size instead of expanding the dashboard when content grows beyond the available height.

- Widget headers stay visible.
- Widget bodies scroll vertically when their content exceeds the available space.
- Horizontal overflow stays hidden to preserve the dashboard grid.
- Overscroll is contained inside the widget so scrolling a long widget does not unexpectedly stretch the card.
