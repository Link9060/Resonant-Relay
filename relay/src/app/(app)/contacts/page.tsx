import { AddPersonDialog } from '@/components/contacts/add-person-dialog';
import { RequestsList } from '@/components/contacts/requests-list';
import { ContactsList } from '@/components/contacts/contacts-list';
import { createClient } from '@/lib/supabase/server';

export default async function ContactsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [connectionsAsA, connectionsAsB, incoming, outgoing] = await Promise.all([
    supabase
      .from('connections')
      .select('id, created_at, other:profiles!connections_user_b_fkey(id, display_name, avatar_url, school)')
      .eq('user_a', user.id),
    supabase
      .from('connections')
      .select('id, created_at, other:profiles!connections_user_a_fkey(id, display_name, avatar_url, school)')
      .eq('user_b', user.id),
    supabase
      .from('connection_requests')
      .select('id, created_at, sender:profiles!connection_requests_sender_id_fkey(id, display_name, avatar_url, school)')
      .eq('recipient_id', user.id)
      .eq('status', 'pending'),
    supabase
      .from('connection_requests')
      .select('id, created_at, recipient:profiles!connection_requests_recipient_id_fkey(id, display_name, avatar_url, school)')
      .eq('sender_id', user.id)
      .eq('status', 'pending'),
  ]);

  const contacts = [...(connectionsAsA.data ?? []), ...(connectionsAsB.data ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium tracking-tight text-ink">Contacts</h1>
        <AddPersonDialog />
      </div>

      <RequestsList incoming={incoming.data ?? []} outgoing={outgoing.data ?? []} />

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-medium text-ink-muted">
          {contacts.length === 0 ? 'No contacts yet' : `${contacts.length} contact${contacts.length === 1 ? '' : 's'}`}
        </h2>
        <ContactsList contacts={contacts as any} />
      </div>
    </div>
  );
}
