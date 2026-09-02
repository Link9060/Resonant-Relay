# Relay private-beta test matrix

**Status:** Prepared for manual signed-in testing. GitHub-only inspection cannot certify these flows.

## Environments

- macOS Chrome
- macOS Safari
- ChromeOS Chrome
- iPhone Safari
- Android Chrome or narrow Chrome mobile viewport

## Route and navigation checks

For each route actually linked by the application, open it directly and refresh:

- `/Resonant-Relay/`
- login/auth callback
- Contacts and add-person flow
- Chats and direct/group conversation detail
- Planner and plan detail
- Calendar
- Email, if enabled
- Profile/settings
- notification deep links

Verify sign-out returns to login, unknown routes show a safe not-found state, and OAuth query parameters survive the static Pages fallback.

## Core loop

With two test accounts:

1. Sign in and confirm profile/Relay Number.
2. Look up the other account by exact Relay Number.
3. Send, accept, decline, and cancel requests as appropriate.
4. Start a direct chat and exchange messages.
5. Refresh and reopen the conversation.
6. Remove/block and confirm direct actions are unavailable as documented.
7. Sign out, sign back in, and confirm history remains.

## Device usability

- Login fits without horizontal overflow.
- Dock/navigation is reachable.
- Add-person dialog opens/closes and accepts keyboard/mobile input.
- Request cards and actions are usable.
- Chat list/thread remain readable.
- Composer remains visible with the mobile keyboard.
- Messages do not overflow.
- Group leave/block/remove controls are not accidental one-tap destructive actions.
- Planner forms fit and scroll.
- Notification dropdown fits the viewport.
- Offline/reconnect and expired-session errors are understandable.
