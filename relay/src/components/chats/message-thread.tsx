'use client';

import { MessageComposer } from '@/components/chats/message-composer';
import { LeaveGroupButton } from '@/components/groups/leave-group-button';
import { contactColor, contactDisplayName, type ContactColorKey } from '@/lib/contact-colors';
import { editMessage } from '@/lib/actions/chats';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { ArrowLeft, Check, Pencil, Users, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
};
type ProfileMap = Record<string, { id: string; display_name: string; avatar_url: string | null }>;
type PreferenceMap = Record<string, { nickname: string | null; color_key: ContactColorKey }>;

export function MessageThread({ conversationId, title, isGroup, groupId, currentUserId, participantsById, preferencesById, initialMessages }: { conversationId: string; title: string; isGroup: boolean; groupId: string | null; currentUserId: string; participantsById: ProfileMap; preferencesById: PreferenceMap; initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const [membersOpen, setMembersOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let typingChannel: RealtimeChannel | null = null;
    const messageChannel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const incoming = payload.new as Message;
        setMessages((current) => current.some((message) => message.id === incoming.id) ? current : [...current, incoming]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const updated = payload.new as Message;
        setMessages((current) => current.map((message) => message.id === updated.id ? updated : message));
      })
      .subscribe();

    void (async () => {
      await supabase.realtime.setAuth();
      if (!active) return;
      typingChannel = supabase
        .channel(`typing:${conversationId}`, { config: { private: true } })
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          const signal = payload as { userId?: string; typing?: boolean };
          if (!signal.userId || signal.userId === currentUserId || !participantsById[signal.userId]) return;
          setTypingUsers((current) => {
            const next = { ...current };
            if (signal.typing) next[signal.userId!] = Date.now() + 3500;
            else delete next[signal.userId!];
            return next;
          });
        })
        .subscribe();
      typingChannelRef.current = typingChannel;
    })();

    return () => {
      active = false;
      typingChannelRef.current = null;
      void supabase.removeChannel(messageChannel);
      if (typingChannel) void supabase.removeChannel(typingChannel);
    };
  }, [conversationId, currentUserId, participantsById]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setTypingUsers((current) => {
        const active = Object.entries(current).filter(([, expiresAt]) => expiresAt > now);
        return active.length === Object.keys(current).length ? current : Object.fromEntries(active);
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const sendTypingSignal = useCallback((typing: boolean) => {
    void typingChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId, typing } });
  }, [currentUserId]);

  const typingNames = useMemo(() => Object.keys(typingUsers).map((userId) => {
    const profile = participantsById[userId];
    return profile ? contactDisplayName(profile, preferencesById[userId]) : null;
  }).filter((name): name is string => Boolean(name)), [participantsById, preferencesById, typingUsers]);

  const members = useMemo(() => Object.values(participantsById).sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return a.display_name.localeCompare(b.display_name);
  }), [currentUserId, participantsById]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, typingNames.length]);

  function beginEdit(message: Message) {
    setEditingId(message.id);
    setEditValue(message.body);
    setEditError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
    setEditError(null);
  }

  async function saveEdit(event: FormEvent, message: Message) {
    event.preventDefault();
    setEditSaving(true);
    setEditError(null);
    const result = await editMessage(message.id, editValue);
    setEditSaving(false);
    if (!result.ok) { setEditError(result.error); return; }
    setMessages((current) => current.map((item) => item.id === message.id ? result.data : item));
    cancelEdit();
  }

  return (
    <div className="flex h-[calc(100vh-57px)] flex-col md:h-screen">
      <header className="relative flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/chats" className="text-ink-muted hover:text-ink md:hidden"><ArrowLeft size={18} /></Link>
          <div className="min-w-0"><h1 className="truncate font-display text-lg font-medium tracking-tight text-ink">{title}</h1>{isGroup && <p className="text-[11px] text-ink-faint">{members.length} member{members.length === 1 ? '' : 's'}</p>}</div>
        </div>
        {isGroup && groupId && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setMembersOpen((open) => !open)} aria-expanded={membersOpen} aria-haspopup="dialog" className="inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-ink-muted hover:bg-surface hover:text-ink"><Users size={16} /><span className="hidden sm:inline">Members</span></button>
            <LeaveGroupButton groupId={groupId} />
          </div>
        )}
        {membersOpen && (
          <>
            <button type="button" aria-label="Close members" className="fixed inset-0 z-30 cursor-default" onClick={() => setMembersOpen(false)} />
            <div role="dialog" aria-label={`${title} members`} className="relay-popover absolute right-4 top-[calc(100%+0.5rem)] z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-surface-raised shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3"><div><p className="text-sm font-medium text-ink">People in {title}</p><p className="text-xs text-ink-faint">{members.length} total</p></div><button type="button" onClick={() => setMembersOpen(false)} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface"><X size={16} /></button></div>
              <ul className="max-h-80 overflow-y-auto p-2">
                {members.map((member) => {
                  const preference = preferencesById[member.id];
                  const name = member.id === currentUserId ? member.display_name : contactDisplayName(member, preference);
                  const color = member.id === currentUserId ? 'rgb(var(--ink))' : contactColor(preference?.color_key);
                  return <li key={member.id} className="flex items-center gap-3 rounded-md px-2 py-2"><div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-semibold" style={{ color, backgroundColor: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}45` }}>{member.avatar_url ? <Image src={member.avatar_url} alt="" fill sizes="36px" className="object-cover" unoptimized /> : name[0]?.toUpperCase()}</div><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{name}{member.id === currentUserId && <span className="ml-1 font-normal text-ink-faint">(you)</span>}</p>{preference?.nickname && <p className="truncate text-xs text-ink-faint">{member.display_name}</p>}</div></li>;
                })}
              </ul>
            </div>
          </>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? <p className="mt-10 text-center text-sm text-ink-faint">Say hi.</p> : (
          <ul className="space-y-3">
            {messages.map((message) => {
              const isMine = message.sender_id === currentUserId;
              const sender = participantsById[message.sender_id];
              const preference = preferencesById[message.sender_id];
              const color = contactColor(preference?.color_key);
              const senderName = sender ? contactDisplayName(sender, preference) : 'Contact';
              const customizedGroupMessage = isGroup && !isMine;
              const canEdit = isMine && clock - new Date(message.created_at).getTime() <= 15 * 60_000;

              if (editingId === message.id) {
                return <li key={message.id} className="flex justify-end"><form onSubmit={(event) => saveEdit(event, message)} className="w-full max-w-[85%] rounded-lg border border-border bg-surface-raised p-3"><textarea autoFocus value={editValue} onChange={(event) => setEditValue(event.target.value)} maxLength={4000} rows={3} className="w-full resize-none rounded-md border border-border bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-ink-muted" />{editError && <p className="mt-2 text-xs text-red-500">{editError}</p>}<div className="mt-2 flex justify-end gap-2"><button type="button" disabled={editSaving} onClick={cancelEdit} className="rounded-md px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface">Cancel</button><button type="submit" disabled={editSaving || !editValue.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-canvas disabled:opacity-40"><Check size={13} />Save edit</button></div></form></li>;
              }

              return (
                <li key={message.id} className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex max-w-[78%] flex-col gap-0.5 ${isMine ? 'items-end' : 'items-start'}`}>
                    {customizedGroupMessage && <span className="flex items-center gap-1.5 px-1 text-[11px] font-medium" style={{ color }}><i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />{senderName}</span>}
                    <div className="flex items-center gap-1.5">
                      {isMine && canEdit && <button type="button" onClick={() => beginEdit(message)} aria-label="Edit message" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint opacity-60 hover:bg-surface hover:text-ink sm:opacity-0 sm:group-hover:opacity-100"><Pencil size={14} /></button>}
                      <div className={`rounded-lg px-3 py-2 text-sm ${isMine ? 'bg-ink text-canvas' : customizedGroupMessage ? 'text-ink' : 'bg-surface-raised text-ink'}`} style={customizedGroupMessage ? { backgroundColor: `${color}1c`, borderLeft: `3px solid ${color}` } : undefined}>{message.body}</div>
                    </div>
                    {message.edited_at && <span className="px-1 text-[10px] text-ink-faint">edited</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {typingNames.length > 0 && <TypingIndicator names={typingNames} />}
        <div ref={bottomRef} />
      </div>
      <MessageComposer conversationId={conversationId} onTypingChange={sendTypingSignal} />
    </div>
  );
}

function TypingIndicator({ names }: { names: string[] }) {
  const label = names.length === 1 ? `${names[0]} is typing` : names.length === 2 ? `${names[0]} and ${names[1]} are typing` : `${names[0]} and ${names.length - 1} others are typing`;
  return <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint"><span className="relay-typing-bubble" aria-hidden="true"><i /><i /><i /></span><span>{label}</span></div>;
}
