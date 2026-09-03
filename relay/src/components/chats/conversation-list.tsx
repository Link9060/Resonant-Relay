'use client';

import Link from 'next/link';
import { staticDetailPath } from '@/lib/config';
import { contactColor, contactDisplayName, type ContactColorKey } from '@/lib/contact-colors';
import { setConversationPreferences } from '@/lib/actions/chats';
import { BellOff, Pin, PinOff } from 'lucide-react';
import { useState } from 'react';

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
  preferencesById,
  conversationPreferences,
}: {
  conversations: ConversationRow[];
  currentUserId: string;
  previewByConversation: Map<string, string>;
  preferencesById: Record<string, { nickname: string | null; color_key: ContactColorKey }>;
  conversationPreferences: Record<string, { muted: boolean; pinned_at: string | null }>;
}) {
  const [settings, setSettings] = useState(conversationPreferences);
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
        const other = conversation.participants.find((p) => p.user_id !== currentUserId);
        const preference = other ? preferencesById[other.user_id] : undefined;
        const title = conversation.type === 'group'
          ? conversation.group?.name ?? 'Group'
          : other ? contactDisplayName(other.profile, preference) : 'Contact';

        const initial = title[0]?.toUpperCase() ?? '?';
        const preview = previewByConversation.get(conversation.id);
        const preferenceState = settings[conversation.id] ?? { muted: false, pinned_at: null };

        async function togglePinned() {
          const pinned = !preferenceState.pinned_at;
          const result = await setConversationPreferences(conversation.id, { pinned });
          if (result.ok) setSettings((current) => ({ ...current, [conversation.id]: { ...preferenceState, pinned_at: pinned ? new Date().toISOString() : null } }));
        }

        return (
          <li key={conversation.id}>
            <div className="flex items-center gap-2 px-3 py-3 hover:bg-surface"><Link href={staticDetailPath('chats', conversation.id)} className="flex min-w-0 flex-1 items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${conversation.type === 'group' ? 'bg-surface-raised text-ink' : ''}`} style={conversation.type === 'direct' ? { color: contactColor(preference?.color_key), backgroundColor: `${contactColor(preference?.color_key)}1f` } : undefined}>
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{title}</p>
                <p className="truncate text-xs text-ink-faint">{preview ?? 'No messages yet'}</p>
              </div>
            </Link><div className="flex items-center gap-1">{preferenceState.muted && <BellOff size={13} className="text-ink-faint" aria-label="Muted" />}<button type="button" onClick={() => void togglePinned()} aria-label={preferenceState.pinned_at ? `Unpin ${title}` : `Pin ${title}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-surface-raised hover:text-ink">{preferenceState.pinned_at ? <PinOff size={14} /> : <Pin size={14} />}</button></div></div>
          </li>
        );
      })}
    </ul>
  );
}
