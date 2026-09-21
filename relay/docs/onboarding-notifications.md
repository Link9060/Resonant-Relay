# Post-setup notification prompt

After a new user finishes Relay onboarding, the completion screen immediately presents notification setup before the user opens the main app.

The prompt reuses Relay's existing `PushToggle` notification flow, so it reflects the current device state rather than showing a separate permission system. Users can enable browser/device push alerts from the completion screen, see when notifications are already enabled, and receive the existing guidance for blocked permissions, unsupported browsers, or iPhone/iPad Home Screen installation requirements.

The **Open Relay** action remains available after the notification prompt, and notification settings can still be changed later in Relay settings.
