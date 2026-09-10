'use client';

import { AddPersonDialog } from '@/components/contacts/add-person-dialog';
import { ContactsList } from '@/components/contacts/contacts-list';
import { ContactsMoreMenu } from '@/components/contacts/contacts-more-menu';
import { DiscoverPeople } from '@/components/contacts/discover-people';
import { RequestsList } from '@/components/contacts/requests-list';
import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { Compass, UserRoundCheck, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';

type ContactsTab = 'contacts' | 'requests' | 'discover';

export default function ContactsPage() {
  const [state, setState] = useState<any>(null);
  const [tab, setTab] = useState<ContactsTab>('contacts');

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [a, b, incoming, outgoing, preferences] = await Promise.all([
        supabase.from('connections').select('id,created_at,other:profiles!connections_user_b_fkey(id,display_name,avatar_url,school,bio,role)').eq('user_a', user.id),
        supabase.from('connections').select('id,created_at,other:profiles!connections_user_a_fkey(id,display_name,avatar_url,school,bio,role)').eq('user_b', user.id),
        supabase.from('connection_requests').select('id,created_at,sender:profiles!connection_requests_sender_id_fkey(id,display_name,avatar_url,school,role)').eq('recipient_id', user.id).eq('status', 'pending'),
        supabase.from('connection_requests').select('id,created_at,recipient:profiles!connection_requests_recipient_id_fkey(id,display_name,avatar_url,school,role)').eq('sender_id', user.id).eq('status', 'pending'),
        supabase.from('contact_preferences').select('contact_id,nickname,color_key').eq('owner_id', user.id),
      ]);
      const failed = [a, b, incoming, outgoing, preferences].find((result) => result.error)?.error;
      if (!active) return;
      if (failed) {
        setState({ error: failed.message });
        return;
      }
      const preferenceByContact = new Map((preferences.data ?? []).map((preference: any) => [preference.contact_id, preference]));
      setState({
        contacts: [...(a.data ?? []), ...(b.data ?? [])]
          .filter((row: any) => row.other)
          .map((row: any) => ({ ...row, preference: preferenceByContact.get(row.other.id) ?? null }))
          .sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime()),
        incoming: (incoming.data ?? []).filter((row: any) => row.sender),
        outgoing: (outgoing.data ?? []).filter((row: any) => row.recipient),
      });
    })();
    return () => { active = false; };
  }, []);

  if (!state) return <PageLoading />;
  if (state.error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
        <PageHeader title="Contacts" />
        <div className="mt-6 rounded-md border border-border p-5">
          <p className="text-sm text-ink">Contacts could not load.</p>
          <p className="mt-1 text-xs text-ink-faint">Reload the page to try again.</p>
          <button type="button" onClick={() => window.location.reload()} className="mt-4 min-h-11 rounded-md bg-ink px-4 text-sm font-medium text-canvas">Reload</button>
        </div>
      </div>
    );
  }

  const requestCount = state.incoming.length + state.outgoing.length;

  function removeContactFromState(connectionId: string) {
    setState((current: any) => current ? { ...current, contacts: current.contacts.filter((contact: any) => contact.id !== connectionId) } : current);
  }

  function updatePreference(connectionId: string, preference: any) {
    setState((current: any) => current ? {
      ...current,
      contacts: current.contacts.map((contact: any) => contact.id === connectionId ? { ...contact, preference } : contact),
    } : current);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
      <PageHeader
        title="Contacts"
        action={(
          <div className="flex items-center gap-2">
            <AddPersonDialog />
            <ContactsMoreMenu onOpenDiscovery={() => setTab('discover')} />
          </div>
        )}
      />
      <p className="mt-1 text-sm text-ink-faint">Your people, connection requests, and mutuals in one place.</p>

      <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface p-1 sm:mt-6" role="tablist" aria-label="Contacts sections">
        <TabButton active={tab === 'contacts'} onClick={() => setTab('contacts')} icon={UserRoundCheck} label="Contacts" count={state.contacts.length} />
        <TabButton active={tab === 'requests'} onClick={() => setTab('requests')} icon={UsersRound} label="Requests" count={requestCount || undefined} attention={state.incoming.length > 0} />
        <TabButton active={tab === 'discover'} onClick={() => setTab('discover')} icon={Compass} label="Discover" />
      </div>

      {tab === 'contacts' && (
        <section className="mt-5 sm:mt-6" role="tabpanel">
          {state.incoming.length > 0 && (
            <button type="button" onClick={() => setTab('requests')} className="mb-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-border bg-surface px-3 text-left transition-colors hover:bg-surface-raised">
              <span className="text-sm font-medium text-ink">{state.incoming.length} connection request{state.incoming.length === 1 ? '' : 's'} waiting</span>
              <span className="text-xs text-ink-muted">Review</span>
            </button>
          )}
          <h2 className="mb-3 text-sm font-medium text-ink-muted">{state.contacts.length === 0 ? 'No contacts yet' : `${state.contacts.length} contact${state.contacts.length === 1 ? '' : 's'}`}</h2>
          <ContactsList contacts={state.contacts} onRemoved={removeContactFromState} onPreferenceUpdated={updatePreference} />
        </section>
      )}

      {tab === 'requests' && (
        <section className="mt-5 sm:mt-6" role="tabpanel">
          <div className="mb-4">
            <h2 className="text-sm font-medium text-ink-muted">Connection requests</h2>
            <p className="mt-1 text-xs text-ink-faint">Incoming and sent requests stay here until they are handled.</p>
          </div>
          {requestCount === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
              <p className="text-sm text-ink-muted">No pending requests.</p>
              <button type="button" onClick={() => setTab('discover')} className="mt-2 min-h-10 px-2 text-xs text-ink-faint underline underline-offset-4 hover:text-ink">Discover people</button>
            </div>
          ) : <RequestsList incoming={state.incoming} outgoing={state.outgoing} />}
        </section>
      )}

      {tab === 'discover' && (
        <section role="tabpanel">
          <DiscoverPeople onOpenRequests={() => setTab('requests')} />
        </section>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
  attention,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Compass;
  label: string;
  count?: number;
  attention?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors sm:text-sm ${active ? 'bg-canvas text-ink shadow-sm' : 'text-ink-muted hover:text-ink'}`}
    >
      <Icon size={15} className="shrink-0" />
      <span className="truncate">{label}</span>
      {count !== undefined && <span className="text-[10px] text-ink-faint">{count}</span>}
      {attention && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-ink" aria-label="New requests" />}
    </button>
  );
}
