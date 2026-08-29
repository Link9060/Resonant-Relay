import { ConnectGoogleButton } from '@/components/google/connect-button';
import { DisconnectGoogleButton } from '@/components/google/disconnect-button';
import { PageHeader } from '@/components/ui/page-header';
import { getIntegrationStatus, getValidAccessToken } from '@/lib/google/tokens';
import { listInboxMessages } from '@/lib/google/gmail';
import { createClient } from '@/lib/supabase/server';

export default async function EmailPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const status = await getIntegrationStatus(user.id, 'gmail');
  const messages = status.connected ? await safeListMessages(user.id) : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <PageHeader
        title="Email"
        subtitle="The school email that actually needs your attention."
        action={
          status.connected ? (
            <DisconnectGoogleButton service="gmail" />
          ) : (
            <ConnectGoogleButton service="gmail" next="/email" />
          )
        }
      />

      {!status.connected && (
        <div className="mt-8 rounded-md border border-dashed border-border py-10 text-center">
          <p className="text-sm text-ink-muted">Connect Gmail to see your inbox here.</p>
          <p className="mt-1 text-xs text-ink-faint">
            Read-only for now — composing and replying come later, with their own permission ask.
          </p>
        </div>
      )}

      {status.connected && (
        <div className="mt-6">
          {messages === null ? (
            <p className="text-sm text-red-500">Couldn&apos;t load your inbox right now.</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-ink-faint">Inbox is empty.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {messages.map((message) => (
                <li key={message.id} className="px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`truncate text-sm ${message.isUnread ? 'font-semibold text-ink' : 'text-ink'}`}>
                      {message.subject}
                    </span>
                    {message.receivedAt && (
                      <span className="shrink-0 text-xs text-ink-faint">{formatSender(message.receivedAt)}</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-faint">{formatFrom(message.from)}</p>
                  <p className="mt-1 truncate text-xs text-ink-muted">{message.snippet}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

async function safeListMessages(userId: string) {
  try {
    const token = await getValidAccessToken(userId, 'gmail');
    if (!token) return null;
    return await listInboxMessages(token, 15);
  } catch {
    return null;
  }
}

function formatFrom(from: string): string {
  // "Jane Doe <jane@school.edu>" -> "Jane Doe"
  return from.replace(/<.*>/, '').trim() || from;
}

function formatSender(rawDate: string): string {
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
