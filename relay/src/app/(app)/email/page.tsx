'use client';

import { EmailMessageList, EmailMessagePreview, type InboxMessage } from '@/components/google/email-message-list';
import { ConnectedAccountsDialog, type ConnectedAccount, type IntegrationProvider } from '@/components/integrations/connected-accounts-dialog';
import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { Inbox, Mail, MailOpen, Search, Settings2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

type Mailbox = 'all' | 'unread' | string;

export default function EmailPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[] | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [mailbox, setMailbox] = useState<Mailbox>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const accountResult = await supabase.functions.invoke('mail-hub', { body: { action: 'accounts' } });
      if (!active) return;
      if (accountResult.error) { setError('Could not load connected inboxes.'); setAccounts([]); return; }
      const nextAccounts: ConnectedAccount[] = accountResult.data?.accounts ?? [];
      setAccounts(nextAccounts);
      if (!nextAccounts.length) { setMessages([]); return; }
      const messageResult = await supabase.functions.invoke('mail-hub', { body: { action: 'messages' } });
      if (!active) return;
      if (messageResult.error) setError('Your accounts are connected, but the inbox could not load right now.');
      setMessages(messageResult.data?.messages ?? []);
    })();
    return () => { active = false; };
  }, []);

  async function connect(provider: IntegrationProvider) {
    setBusy(provider); setError(null);
    const { data, error: invokeError } = await createClient().functions.invoke('mail-hub', { body: { action: 'connect_start', provider } });
    if (invokeError || !data?.url) { setError(data?.error ?? `${provider === 'google' ? 'Google' : 'Microsoft'} connection is not configured yet.`); setBusy(null); return; }
    window.location.assign(data.url);
  }

  async function disconnect(account: ConnectedAccount) {
    if (!window.confirm(`Disconnect ${account.email_address} from Relay email and calendar?`)) return;
    setBusy(account.id); setError(null);
    const { error: invokeError } = await createClient().functions.invoke('mail-hub', { body: { action: 'disconnect', accountId: account.id } });
    if (invokeError) { setError('Could not disconnect that account.'); setBusy(null); return; }
    setAccounts((current) => current?.filter((item) => item.id !== account.id) ?? []);
    setMessages((current) => current.filter((message) => message.accountId !== account.id));
    if (mailbox === account.id) setMailbox('all');
    setSelectedId(null);
    setBusy(null);
  }

  const counts = useMemo(() => ({
    all: messages.length,
    unread: messages.filter((message) => message.isUnread).length,
  }), [messages]);

  const filteredMessages = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return messages.filter((message) => {
      const inMailbox = mailbox === 'all' || (mailbox === 'unread' ? message.isUnread : message.accountId === mailbox);
      const matchesQuery = !normalized || [message.subject, message.from, message.snippet, message.accountEmail].some((value) => value?.toLowerCase().includes(normalized));
      return inMailbox && matchesQuery;
    });
  }, [mailbox, messages, query]);

  const selectedMessage = messages.find((message) => message.id === selectedId) ?? null;
  const mailboxLabel = mailbox === 'all' ? 'All Inboxes' : mailbox === 'unread' ? 'Unread' : accounts?.find((account) => account.id === mailbox)?.email_address ?? 'Inbox';

  if (!accounts) return <PageLoading />;

  const selectMailbox = (id: Mailbox) => {
    setMailbox(id);
    setSelectedId(null);
  };

  const mailboxButton = (id: Mailbox, label: string, count: number, icon: React.ReactNode) => (
    <button key={id} type="button" onClick={() => selectMailbox(id)} className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-[color,background-color,transform] duration-200 ${mailbox === id ? 'bg-surface-raised font-medium text-ink' : 'text-ink-muted hover:bg-surface hover:text-ink'}`}>
      <span className={`text-ink-faint transition-transform duration-200 ${mailbox === id ? 'scale-110' : ''}`}>{icon}</span><span className="min-w-0 flex-1 truncate">{label}</span><span className="text-xs tabular-nums text-ink-faint">{count}</span>
    </button>
  );

  return <div className="mx-auto max-w-[94rem] px-4 py-8 md:px-6">
    <PageHeader title="Email" subtitle="Every inbox, organized by account." action={<button type="button" onClick={() => setManageOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"><Settings2 size={16} /> Accounts</button>} />

    {error && !manageOpen && <div className="mt-5 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">{error}</div>}
    <div className="mt-6 overflow-hidden rounded-xl border border-border bg-canvas shadow-sm">
      <div className="grid min-h-[38rem] lg:grid-cols-[13.5rem_22rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-surface/60 p-3 lg:block">
          <p className="px-2.5 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">Mailboxes</p>
          <nav className="space-y-0.5">{mailboxButton('all', 'All Inboxes', counts.all, <Inbox size={16} />)}{mailboxButton('unread', 'Unread', counts.unread, <MailOpen size={16} />)}</nav>
          {accounts.length > 0 && <><p className="mt-6 px-2.5 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">Accounts</p><nav className="space-y-0.5">{accounts.map((account) => mailboxButton(account.id, account.email_address, messages.filter((message) => message.accountId === account.id).length, <span className={`block h-2.5 w-2.5 rounded-full ${account.provider === 'google' ? 'bg-red-500' : 'bg-blue-500'}`} />))}</nav></>}
        </aside>

        <section className={`${selectedMessage ? 'hidden lg:flex' : 'flex'} min-w-0 flex-col border-r border-border`}>
          <div className="border-b border-border p-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5 lg:hidden">
              {[{ id: 'all', label: 'All', count: counts.all }, { id: 'unread', label: 'Unread', count: counts.unread }, ...accounts.map((account) => ({ id: account.id, label: account.email_address, count: messages.filter((message) => message.accountId === account.id).length }))].map((item) => <button key={item.id} type="button" onClick={() => selectMailbox(item.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-[background-color,color,transform] duration-200 ${mailbox === item.id ? 'bg-ink text-canvas scale-[1.02]' : 'bg-surface text-ink-muted'}`}>{item.label} · {item.count}</button>)}
            </div>
            <div key={String(mailbox)} className="relay-motion-crossfade flex items-center justify-between gap-3"><div><h2 className="truncate text-sm font-semibold text-ink">{mailboxLabel}</h2><p className="mt-0.5 text-xs text-ink-faint">{filteredMessages.length} messages</p></div></div>
            <label className="mt-3 flex items-center gap-2 rounded-lg bg-surface px-3 py-2.5 text-ink-faint transition-shadow focus-within:shadow-sm"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this mailbox" className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint" /></label>
          </div>
          <div key={`${mailbox}:${query}`} className="relay-motion-crossfade min-h-0 flex-1 overflow-y-auto"><EmailMessageList messages={filteredMessages} selectedId={selectedId} onSelect={setSelectedId} /></div>
        </section>

        <section className={`${selectedMessage ? 'block' : 'hidden lg:block'} min-w-0 overflow-hidden`}>
          <div key={selectedMessage?.id ?? 'empty'} className={selectedMessage ? 'relay-motion-slide-right h-full' : 'h-full'}><EmailMessagePreview message={selectedMessage} onBack={() => setSelectedId(null)} /></div>
        </section>
      </div>
    </div>

    {accounts.length === 0 && <div className="pointer-events-none absolute inset-x-0 top-72 flex justify-center px-6"><button type="button" onClick={() => setManageOpen(true)} className="pointer-events-auto inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-canvas"><Mail size={15} /> Connect an inbox</button></div>}
    {manageOpen && <ConnectedAccountsDialog accounts={accounts} busy={busy} error={error} title="Email accounts" onClose={() => setManageOpen(false)} onConnect={(provider) => void connect(provider)} onDisconnect={(account) => void disconnect(account)} />}
  </div>;
}
