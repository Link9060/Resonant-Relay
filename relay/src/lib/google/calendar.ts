import 'server-only';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string; // ISO datetime, or yyyy-mm-dd for all-day events
  end: string;
  isAllDay: boolean;
  htmlLink: string;
}

/**
 * Lists upcoming events on the student's primary calendar.
 * Ref: https://developers.google.com/workspace/calendar/api/v3/reference/events/list
 */
export async function listUpcomingEvents(accessToken: string, maxResults = 10): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: new Date().toISOString(),
    maxResults: String(maxResults),
    singleEvents: 'true',
    orderBy: 'startTime',
  });

  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    items: Array<{
      id: string;
      summary?: string;
      htmlLink: string;
      start: { dateTime?: string; date?: string };
      end: { dateTime?: string; date?: string };
    }>;
  };

  return (data.items ?? []).map((event) => ({
    id: event.id,
    summary: event.summary ?? '(No title)',
    start: event.start.dateTime ?? event.start.date ?? '',
    end: event.end.dateTime ?? event.end.date ?? '',
    isAllDay: !event.start.dateTime,
    htmlLink: event.htmlLink,
  }));
}
