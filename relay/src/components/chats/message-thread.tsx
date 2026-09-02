'use client';

import { MessageComposer } from '@/components/chats/message-composer';
import { LeaveGroupButton } from '@/components/groups/leave-group-button';
import { createClient } from '@/lib/supabase/client';
import { contactColor, contactDisplayName, type ContactColorKey } from '@/lib/contact-colors';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string };
type ProfileMap = Record<string, { id: string; display_name: string; avatar_url: string | null }>;
type PreferenceMap = Record<string, { nickname: string | null; color_key: ContactColorKey }>;

export function MessageThread({ conversationId, title, isGroup, groupId, currentUserId, participantsById, preferencesById, initialMessages }: { conversationId: string; title: string; isGroup: boolean; groupId: string | null; currentUserId: string; participantsById: ProfileMap; preferencesById: PreferenceMap; initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`conversation:${conversationId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
      setMessages((prev) => prev.some((m) => m.id === (payload.new as Message).id) ? prev : [...prev, payload.new as Message]);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  return <div className="flex h-[calc(100vh-57px)] flex-col md:h-screen"><header className="flex items-center justify-between border-b border-border px-4 py-3"><div className="flex items-center gap-2"><Link href="/chats" className="text-ink-muted hover:text-ink md:hidden"><ArrowLeft size={18} /></Link><h1 className="font-display text-lg font-medium tracking-tight text-ink">{title}</h1></div>{isGroup && groupId && <LeaveGroupButton groupId={groupId} />}</header><div className="flex-1 overflow-y-auto px-4 py-4">{messages.length === 0 ? <p className="mt-10 text-center text-sm text-ink-faint">Say hi.</p> : <ul className="space-y-3">{messages.map((message) => { const isMine = message.sender_id === currentUserId; const sender = participantsById[message.sender_id]; const preference = preferencesById[message.sender_id]; const color = contactColor(preference?.color_key); const senderName = sender ? contactDisplayName(sender, preference) : 'Contact'; const customizedGroupMessage = isGroup && !isMine; return <li key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>{customizedGroupMessage && <span className="flex items-center gap-1.5 px-1 text-[11px] font-medium" style={{ color }}><i className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />{senderName}</span>}<div className={`rounded-lg px-3 py-2 text-sm ${isMine ? 'bg-ink text-canvas' : customizedGroupMessage ? 'text-ink' : 'bg-surface-raised text-ink'}`} style={customizedGroupMessage ? { backgroundColor: `${color}1c`, borderLeft: `3px solid ${color}` } : undefined}>{message.body}</div></div></li>; })}</ul>}<div ref={bottomRef} /></div><MessageComposer conversationId={conversationId} /></div>;
}
