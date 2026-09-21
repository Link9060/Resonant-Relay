// Relay only requests Google Calendar access beyond identity scopes.
// Gmail access has been removed so Relay never requests restricted Gmail scopes.
export const GOOGLE_SCOPES = {
  calendar: 'https://www.googleapis.com/auth/calendar.events.readonly',
} as const;

export type GoogleService = keyof typeof GOOGLE_SCOPES;
