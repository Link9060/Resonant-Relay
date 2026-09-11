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

const CHAT_LOAD_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: PromiseLike<T>, label: string, ms = CHAT_LOAD_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export default function ChatsPage() {
  const [state, setState] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let userId: string | null = null;
    let refreshTimer: number | null = null;
    let channel: any = null;
    const supabase = createClient() as any;

    async function loadChats(id: string) {
      setLoadError(null);
      try {
        const membershipResult = await withTimeout<any>(
          supabase
            .from('conversation_participants')
            .select('conversation_id,conversation:conversations(id,type,last_message_at,group:groups(id,name))')
            .eq('user_id', id),
          'Conversation list',
        );
        if (membershipResult.error) throw membershipResult.error;

        const conversations = (membershipResult.data ?? [])
          .map((row: any) => row.conversation)
          .filter(Boolean)
          .map((conversation: any) => ({ ...conversation, participants: [] as any[] }));
        const ids = conversations.map((conversation: any) => conversation.id);

        let participantRows: any[] = [];
        let messageRows: any[] = [];
        let conversationPreferenceRows: any[] = [];

        if (ids.length) {
          const [participantResult, messageResult, conversationPreferenceResult] = await withTimeout<any[]>(
            Promise.all([
              supabase
                .from('conversation_participants')
                .select('conversation_id,user_id,profile:profiles(id,display_name,avatar_url,role)')
                .in('conversation_id', ids),
              supabase
                .from('messages')
                .select('conversation_id,body,attachments,created_at')
                .in('conversation_id', ids)
                .order('created_at', { ascending: false }),
              supabase
                .from('conversation_preferences')
                .select('conversation_id,muted,pinned_at')
                .eq('user_id', id)
                .in('conversation_id', ids),
            ]),
            'Conversation details',
          );

          if (participantResult.error) throw participantResult.error;
          if (messageResult.error) throw messageResult.error;
          if (conversationPreferenceResult.error) throw conversationPreferenceResult.error;
          participantRows = participantResult.data ?? [];
          messageRows = messageResult.data ?? [];
          conversationPreferenceRows = conversationPreferenceResult.data ?? [];
        }

        const participantsByConversation = new Map<string, any[]>();
        for (const participant of participantRows) {
          if (!participant?.conversation_id || !participant?.profile) continue;
          const current = participantsByConversation.get(participant.conversation_id) ?? [];
          current.push({ user_id: participant.user_id, profile: participant.profile });
          participantsByConversation.set(participant.conversation_id, current);
        }
        for (const conversation of conversations) {
          conversation.participants = participantsByConversation.get(conversation.id) ?? [];
        }

        const preferenceByConversation = Object.fromEntries(
          conversationPreferenceRows.map((item: any) => [item.conversation_id, item]),
        );
        conversations.sort((a: any, b: any) => {
          const aPin = preferenceByConversation[a.id]?.pinned_at;
          const bPin = preferenceByConversation[b.id]?.pinned_at;
          if (aPin && !bPin) return -1;
          if (!aPin && bPin) return 1;
          const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
          const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
          return bTime - aTime;
        });

        const previews = new Map<string, string>();
        for (const message of messageRows) {
          if (previews.has(message.conversation_id)) continue;
          previews.set(
            message.conversation_id,
            message.body || (message.attachments?.[0]?.name ? `Attachment: ${message.attachments[0].name}` : 'Attachment'),
          );
        }

        const [asA, asB] = await withTimeout<any[]>(
          Promise.all([
            supabase.from('connections').select('other:profiles!connections_user_b_fkey(id,display_name,avatar_url,role)').eq('user_a', id),
            supabase.from('connections').select('other:profiles!connections_user_a_fkey(id,display_name,avatar_url,role)').eq('user_b', id),
          ]),
          'Chat contacts',
        );
        if (asA.error) throw asA.error;
        if (asB.error) throw asB.error;

        const contacts = [...(asA.data ?? []), ...(asB.data ?? [])]
          .map((row: any) => row.other)
          .filter(Boolean);

        let preferenceRows: any[] = [];
        if (contacts.length) {
          const preferenceResult = await withTimeout<any>(
            supabase
              .from('contact_preferences')
              .select('contact_id,nickname,color_key')
              .eq('owner_id', id)
              .in('contact_id', contacts.map((contact: any) => contact.id)),
            'Chat contact preferences',
          );
          if (preferenceResult.error) throw preferenceResult.error;
          preferenceRows = preferenceResult.data ?? [];
        }

        const preferencesById = Object.fromEntries(
          preferenceRows.map((preference: any) => [preference.contact_id, preference]),
        );
        const titles = Object.fromEntries(conversations.map((conversation: any) => {
          const other = conversation.participants.find((participant: any) => participant.user_id !== id && participant.profile);
          return [
            conversation.id,
            conversation.type === 'group'
              ? conversation.group?.name ?? 'Group'
              : other
                ? contactDisplayName(other.profile, preferencesById[other.user_id])
                : 'Contact',
          ];
        }));

        if (!active) return;
        setState({
          userId: id,
          conversations,
          previews,
          contacts: contacts.map((contact: any) => ({ ...contact, preference: preferencesById[contact.id] ?? null })),
          preferencesById,
          preferenceByConversation,
          titles,
        });
      } catch (error) {
        if (!active) return;
        console.error('Relay chats load failed', error);
        setLoadError(error instanceof Error ? error.message : 'Chats could not load.');
      }
    }

    function scheduleRefresh() {
      if (!active || !userId) return;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        if (active && userId) void loadChats(userId);
      }, 180);
    }

    void (async () => {
      try {
        const authResult = await withTimeout<any>(supabase.auth.getUser(), 'Authentication');
        if (!active) return;
        if (authResult.error) throw authResult.error;
        const user = authResult.data?.user;
        if (!user) {
          setLoadError('Your Relay session is not available. Sign in again.');
          return;
        }

        userId = user.id;
        await loadChats(user.id);
        if (!active) return;

        channel = supabase
          .channel(`chat-list:${user.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, scheduleRefresh)
          .subscribe();
      } catch (error) {
        if (!active) return;
        console.error('Relay chats bootstrap failed', error);
        setLoadError(error instanceof Error ? error.message : 'Chats could not load.');
      }
    })();

    const onFocus = () => scheduleRefresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      if (channel) void supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  async function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setSearchError(null);
    try {
      const { data, error } = await withTimeout<any>(
        createClient().rpc('search_my_messages', { p_query: query.trim() }),
        'Message search',
      );
      if (error) throw error;
      setResults(data ?? []);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search could not be completed.');
    } finally {
      setSearching(false);
    }
  }

  const shownResults = useMemo(
    () => results?.map((item) => ({ ...item, title: state?.titles[item.conversation_id] ?? 'Conversation' })) ?? [],
    [results, state],
  );

  if (!state && !loadError) return <PageLoading />;

  if (!state && loadError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
        <PageHeader title="Chats" subtitle="Messages, files, replies, and everything you pinned." />
        <div className="mt-6 rounded-xl border border-border bg-surface p-5">
          <p className="text-sm font-medium text-ink">Chats could not load.</p>
          <p className="mt-1 text-xs leading-5 text-ink-faint">{loadError}</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-11 rounded-md bg-ink px-4 text-sm font-medium text-canvas">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <PageHeader title="Chats" subtitle="Messages, files, replies, and everything you pinned." action={<NewChatDialog contacts={state.contacts} />} />

      {loadError && (
        <div className="mt-4 rounded-md border border-border bg-surface px-3 py-2 text-xs text-ink-muted">
          Relay had trouble refreshing chats. Your last loaded conversations are still shown.
        </div>
      )}

      <form onSubmit={search} className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input value={query} onChange={(event) => { setQuery(event.target.value); if (!event.target.value) { setResults(null); setSearchError(null); } }} minLength={2} placeholder="Search messages and attachment names" className="profile-input pl-9 pr-9" />
          {query && <button type="button" onClick={() => { setQuery(''); setResults(null); setSearchError(null); }} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"><X size={14} /></button>}
        </div>
        <button type="submit" disabled={searching || query.trim().length < 2} className="rounded-md bg-ink px-4 text-sm font-medium text-canvas disabled:opacity-40">{searching ? 'Searching…' : 'Search'}</button>
      </form>

      {searchError && <div className="mt-3 rounded-md border border-border px-3 py-2 text-xs text-ink-muted">{searchError}</div>}

      {results ? (
        <section className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Search results</p>
            <button type="button" onClick={() => setResults(null)} className="text-xs text-ink-muted">Back to chats</button>
          </div>
          {shownResults.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-ink-faint">No matching messages or files.</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border">
              {shownResults.map((item) => (
                <li key={item.message_id}>
                  <a href={appPageUrl(staticDetailPath('chats', item.conversation_id))} className="flex items-start gap-3 px-3 py-3 hover:bg-surface">
                    <FileText size={16} className="mt-0.5 shrink-0 text-ink-faint" />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-ink-muted">{item.title}</span>
                      <span className="mt-1 block truncate text-sm text-ink">{item.body || item.attachment_names}</span>
                      {item.attachment_names && <span className="mt-1 block truncate text-xs text-ink-faint">{item.attachment_names}</span>}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="mt-6">
          <ConversationList conversations={state.conversations} currentUserId={state.userId} previewByConversation={state.previews} preferencesById={state.preferencesById} conversationPreferences={state.preferenceByConversation} />
        </div>
      )}
    </div>
  );
}
