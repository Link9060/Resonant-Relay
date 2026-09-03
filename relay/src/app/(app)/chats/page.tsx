'use client';

import { ConversationList } from '@/components/chats/conversation-list';
import { NewChatDialog } from '@/components/chats/new-chat-dialog';
import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { contactDisplayName } from '@/lib/contact-colors';
import { appPageUrl, staticDetailPath } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { FileText, Search, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

export default function ChatsPage() {
  const [state, setState] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => { void (async () => {
    const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data: rows } = await supabase.from('conversation_participants').select(`conversation:conversations(id,type,last_message_at,group:groups(id,name),participants:conversation_participants(user_id,profile:profiles(id,display_name,avatar_url)))`).eq('user_id', user.id);
    const conversations = (rows ?? []).map((row: any) => row.conversation).filter(Boolean);
    const ids = conversations.map((conversation: any) => conversation.id);
    const [messageResult, conversationPreferenceResult] = await Promise.all([
      ids.length ? supabase.from('messages').select('conversation_id,body,attachments,created_at').in('conversation_id', ids).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
      ids.length ? supabase.from('conversation_preferences').select('conversation_id,muted,pinned_at').eq('user_id', user.id).in('conversation_id', ids) : Promise.resolve({ data: [] }),
    ]);
    const preferenceByConversation = Object.fromEntries((conversationPreferenceResult.data ?? []).map((item: any) => [item.conversation_id, item]));
    conversations.sort((a: any, b: any) => { const aPin = preferenceByConversation[a.id]?.pinned_at; const bPin = preferenceByConversation[b.id]?.pinned_at; if (aPin && !bPin) return -1; if (!aPin && bPin) return 1; return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(); });
    const previews = new Map<string, string>(); for (const message of messageResult.data ?? []) if (!previews.has(message.conversation_id)) previews.set(message.conversation_id, message.body || (message.attachments?.[0]?.name ? `Attachment: ${message.attachments[0].name}` : 'Attachment'));
    const [asA, asB] = await Promise.all([supabase.from('connections').select('other:profiles!connections_user_b_fkey(id,display_name,avatar_url)').eq('user_a', user.id), supabase.from('connections').select('other:profiles!connections_user_a_fkey(id,display_name,avatar_url)').eq('user_b', user.id)]);
    const contacts = [...(asA.data ?? []), ...(asB.data ?? [])].map((row: any) => row.other).filter(Boolean);
    const { data: preferences } = contacts.length ? await supabase.from('contact_preferences').select('contact_id,nickname,color_key').eq('owner_id', user.id).in('contact_id', contacts.map((contact: any) => contact.id)) : { data: [] };
    const preferencesById = Object.fromEntries((preferences ?? []).map((preference: any) => [preference.contact_id, preference]));
    const titles = Object.fromEntries(conversations.map((conversation: any) => { const other = conversation.participants.find((participant: any) => participant.user_id !== user.id); return [conversation.id, conversation.type === 'group' ? conversation.group?.name ?? 'Group' : other ? contactDisplayName(other.profile, preferencesById[other.user_id]) : 'Contact']; }));
    setState({ userId: user.id, conversations, previews, contacts: contacts.map((contact: any) => ({ ...contact, preference: preferencesById[contact.id] ?? null })), preferencesById, preferenceByConversation, titles });
  })(); }, []);

  async function search(event: FormEvent) { event.preventDefault(); if (query.trim().length < 2) return; setSearching(true); const { data } = await createClient().rpc('search_my_messages', { p_query: query.trim() }); setResults(data ?? []); setSearching(false); }
  const shownResults = useMemo(() => results?.map((item) => ({ ...item, title: state?.titles[item.conversation_id] ?? 'Conversation' })) ?? [], [results, state]);
  if (!state) return <PageLoading />;

  return <div className="mx-auto max-w-2xl px-4 py-8 md:px-6"><PageHeader title="Chats" subtitle="Messages, files, replies, and everything you pinned." action={<NewChatDialog contacts={state.contacts} />} />
    <form onSubmit={search} className="mt-5 flex gap-2"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" /><input value={query} onChange={(event) => { setQuery(event.target.value); if (!event.target.value) setResults(null); }} minLength={2} placeholder="Search messages and attachment names" className="profile-input pl-9 pr-9" />{query && <button type="button" onClick={() => { setQuery(''); setResults(null); }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"><X size={14} /></button>}</div><button type="submit" disabled={searching || query.trim().length < 2} className="rounded-md bg-ink px-4 text-sm font-medium text-canvas disabled:opacity-40">{searching ? 'Searching…' : 'Search'}</button></form>
    {results ? <section className="mt-5"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Search results</p><button type="button" onClick={() => setResults(null)} className="text-xs text-ink-muted">Back to chats</button></div>{shownResults.length === 0 ? <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-ink-faint">No matching messages or files.</p> : <ul className="divide-y divide-border rounded-md border border-border">{shownResults.map((item) => <li key={item.message_id}><a href={appPageUrl(staticDetailPath('chats', item.conversation_id))} className="flex items-start gap-3 px-3 py-3 hover:bg-surface"><FileText size={16} className="mt-0.5 shrink-0 text-ink-faint" /><span className="min-w-0"><span className="block text-xs font-medium text-ink-muted">{item.title}</span><span className="mt-1 block truncate text-sm text-ink">{item.body || item.attachment_names}</span>{item.attachment_names && <span className="mt-1 block truncate text-xs text-ink-faint">{item.attachment_names}</span>}</span></a></li>)}</ul>}</section> : <div className="mt-6"><ConversationList conversations={state.conversations} currentUserId={state.userId} previewByConversation={state.previews} preferencesById={state.preferencesById} conversationPreferences={state.preferenceByConversation} /></div>}
  </div>;
}
