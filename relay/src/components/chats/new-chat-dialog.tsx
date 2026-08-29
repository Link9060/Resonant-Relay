'use client';

import { createGroup, startDirectConversation } from '@/lib/actions/chats';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { Loader2, MessageCirclePlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Contact = { id: string; display_name: string; avatar_url: string | null };

export function NewChatDialog({ contacts }: { contacts: Contact[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [groupName, setGroupName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function reset() {
    setTab('direct');
    setGroupName('');
    setSelected(new Set());
    setError(null);
    setLoading(false);
  }

  async function handleStartDirect(contactId: string) {
    setLoading(true);
    setError(null);
    const result = await startDirectConversation(contactId);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.push(`/chats/${result.data.conversationId}`);
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) {
      setError('Give the group a name.');
      return;
    }
    if (selected.size === 0) {
      setError('Add at least one person.');
      return;
    }
    setLoading(true);
    setError(null);
    const result = await createGroup(groupName, Array.from(selected));
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOpen(false);
    router.push(`/chats/${result.data.conversationId}`);
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-canvas transition-all hover:opacity-90 active:scale-[0.97]">
          <MessageCirclePlus size={16} />
          New
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-30 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-surface-raised p-5 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between">
            <Dialog.Title className="font-display text-lg font-medium text-ink">New</Dialog.Title>
            <Dialog.Close className="text-ink-faint hover:text-ink">
              <X size={18} />
            </Dialog.Close>
          </div>

          <Tabs.Root value={tab} onValueChange={(v) => setTab(v as 'direct' | 'group')} className="mt-4">
            <Tabs.List className="flex gap-1 rounded-md bg-surface p-1">
              <Tabs.Trigger
                value="direct"
                className="flex-1 rounded-sm py-1.5 text-sm font-medium text-ink-muted data-[state=active]:bg-surface-raised data-[state=active]:text-ink"
              >
                Message
              </Tabs.Trigger>
              <Tabs.Trigger
                value="group"
                className="flex-1 rounded-sm py-1.5 text-sm font-medium text-ink-muted data-[state=active]:bg-surface-raised data-[state=active]:text-ink"
              >
                Group
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="direct" className="mt-4">
              {contacts.length === 0 ? (
                <EmptyContacts />
              ) : (
                <ul className="max-h-64 space-y-1 overflow-y-auto">
                  {contacts.map((c) => (
                    <li key={c.id}>
                      <button
                        disabled={loading}
                        onClick={() => handleStartDirect(c.id)}
                        className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-surface"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-medium text-ink">
                          {c.display_name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-ink">{c.display_name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Tabs.Content>

            <Tabs.Content value="group" className="mt-4">
              {contacts.length === 0 ? (
                <EmptyContacts />
              ) : (
                <>
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name"
                    className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus-visible:border-accent"
                  />
                  <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                    {contacts.map((c) => (
                      <li key={c.id}>
                        <label className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface">
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggleSelected(c.id)}
                            className="h-4 w-4 rounded border-border"
                          />
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-medium text-ink">
                            {c.display_name[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm text-ink">{c.display_name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={handleCreateGroup}
                    disabled={loading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-ink py-2.5 text-sm font-medium text-canvas disabled:opacity-40"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Create group
                  </button>
                </>
              )}
            </Tabs.Content>
          </Tabs.Root>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EmptyContacts() {
  return (
    <p className="py-6 text-center text-sm text-ink-faint">
      Add someone in Contacts first — Relay only messages people you already know.
    </p>
  );
}
