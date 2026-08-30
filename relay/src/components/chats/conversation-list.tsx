import Link from 'next/link';
import { staticDetailPath } from '@/lib/config';

type Participant = { user_id: string; profile: { id: string; display_name: string; avatar_url: string | null } };
type ConversationRow = {
  id: string;
  type: 'direct' | 'group';
  last_message_at: string;
  group: { id: string; name: string } | null;
  participants: Participant[];
};

export function ConversationList({
  conversations,
  currentUserId,
  previewByConversation,
}: {
  conversations: ConversationRow[];
  currentUserId: string;
  previewByConversation: Map<string, string>;
}) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border py-14 text-center">
        <p className="text-sm text-ink-muted">No conversations yet.</p>
        <p className="mt-1 text-xs text-ink-faint">Start one with a contact or create a group.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-md border border-border">
      {conversations.map((conversation) => {
        const title =
          conversation.type === 'group'
            ? conversation.group?.name ?? 'Group'
            : conversation.participants.find((p) => p.user_id !== currentUserId)?.profile.display_name ?? 'Contact';

        const initial = title[0]?.toUpperCase() ?? '?';
        const preview = previewByConversation.get(conversation.id);

        return (
          <li key={conversation.id}>
            <Link href={staticDetailPath('chats', conversation.id)} className="flex items-center gap-3 px-3 py-3 hover:bg-surface">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-sm font-medium text-ink">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{title}</p>
                <p className="truncate text-xs text-ink-faint">{preview ?? 'No messages yet'}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
