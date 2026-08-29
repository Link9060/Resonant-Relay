// Google's own scope guidance: "choose the most narrowly focused scope
// possible." Relay only ever reads events/messages in the MVP, so both
// scopes are read-only. Compose/reply would need gmail.send requested later,
// incrementally, only when the student taps compose — not bundled in here.
export const GOOGLE_SCOPES = {
  calendar: 'https://www.googleapis.com/auth/calendar.events.readonly',
  gmail: 'https://www.googleapis.com/auth/gmail.readonly',
} as const;

export type GoogleService = keyof typeof GOOGLE_SCOPES;
