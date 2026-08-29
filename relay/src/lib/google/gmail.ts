import 'server-only';

export interface InboxMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  receivedAt: string | null;
  isUnread: boolean;
}

/**
 * Lists recent inbox messages with just enough metadata for a list view.
 * Two-step fetch (list, then get per message) is the standard Gmail API
 * pattern — see https://developers.google.com/workspace/gmail/api/guides/list-messages
 * Kept unbatched for MVP clarity; worth switching to a batch request if the
 * inbox view needs to scale past a page of ~15 messages.
 */
export async function listInboxMessages(accessToken: string, maxResults = 15): Promise<InboxMessage[]> {
  const listParams = new URLSearchParams({ maxResults: String(maxResults), labelIds: 'INBOX' });
  const listResponse = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?${listParams}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listResponse.ok) {
    throw new Error(`Gmail API error: ${listResponse.status}`);
  }

  const { messages } = (await listResponse.json()) as { messages?: { id: string }[] };
  if (!messages || messages.length === 0) return [];

  const detailed = await Promise.all(
    messages.map(async (m) => {
      const detailParams = new URLSearchParams({ format: 'metadata' });
      detailParams.append('metadataHeaders', 'Subject');
      detailParams.append('metadataHeaders', 'From');
      detailParams.append('metadataHeaders', 'Date');

      const detailResponse = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${m.id}?${detailParams}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!detailResponse.ok) return null;

      const detail = (await detailResponse.json()) as {
        id: string;
        snippet: string;
        labelIds?: string[];
        payload: { headers: { name: string; value: string }[] };
      };

      const header = (name: string) => detail.payload.headers.find((h) => h.name === name)?.value ?? '';

      return {
        id: detail.id,
        subject: header('Subject') || '(No subject)',
        from: header('From'),
        snippet: detail.snippet,
        receivedAt: header('Date') || null,
        isUnread: detail.labelIds?.includes('UNREAD') ?? false,
      } satisfies InboxMessage;
    })
  );

  return detailed.filter((m): m is InboxMessage => m !== null);
}
