'use client';

import { EmailMessageList } from '@/components/google/email-message-list';
import { PageLoading } from '@/components/page-loading';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/client';
import { Mail, Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';

type Provider = 'google' | 'microsoft';
type Account = { id: string; provider: Provider; email_address: string; display_name: string | null; connected_at: string };

export default function EmailPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { void (async () => {
    const supabase = createClient();
    const accountResult = await supabase.functions.invoke('mail-hub', { body: { action: 'accounts' } });
    if (accountResult.error) { setError('Could not load connected inboxes.'); setAccounts([]); return; }
    const nextAccounts = accountResult.data?.accounts ?? [];
    setAccounts(nextAccounts);
    if (nextAccounts.length) {
      const messageResult = await supabase.functions.invoke('mail-hub', { body: { action: 'messages' } });
      if (messageResult.error) setError('Your accounts are connected, but the inbox could not load right now.');
      setMessages(messageResult.data?.messages ?? []);
    }
  })(); }, []);

  async function connect(provider: Provider) {
    setBusy(provider); setError(null);
    const { data, error: invokeError } = await createClient().functions.invoke('mail-hub', { body: { action: 'connect_start', provider } });
    if (invokeError || !data?.url) { setError(data?.error ?? `${provider === 'google' ? 'Google' : 'Microsoft'} connection is not configured yet.`); setBusy(null); return; }
    window.location.assign(data.url);
  }

  async function disconnect(account: Account) {
    setBusy(account.id); setError(null);
    const { error: invokeError } = await createClient().functions.invoke('mail-hub', { body: { action: 'disconnect', accountId: account.id } });
    if (invokeError) { setError('Could not disconnect that account.'); setBusy(null); return; }
    setAccounts((current) => current?.filter((item) => item.id !== account.id) ?? []);
    setMessages((current) => current.filter((message) => message.accountId !== account.id));
    setBusy(null);
  }

  if (!accounts) return <PageLoading />;
  const canAdd = accounts.length < 3;

  return <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
    <PageHeader title="Email" subtitle="One inbox view for up to three Google or Microsoft accounts." />
    <section className="mt-6 rounded-lg border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-sm font-medium text-ink">Connected accounts</h2><p className="mt-0.5 text-xs text-ink-faint">{accounts.length} of 3 connected · read-only access</p></div><Mail size={18} className="text-ink-faint" /></div>
      {accounts.length > 0 && <ul className="mt-4 space-y-2">{accounts.map((account) => <li key={account.id} className="flex items-center gap-3 rounded-md bg-surface px-3 py-2.5"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${account.provider === 'google' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>{account.provider === 'google' ? 'G' : 'M'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{account.email_address}</p><p className="text-xs capitalize text-ink-faint">{account.provider}</p></div><button type="button" disabled={busy === account.id} onClick={() => void disconnect(account)} aria-label={`Disconnect ${account.email_address}`} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-faint hover:bg-surface-raised hover:text-ink disabled:opacity-40"><X size={15} /></button></li>)}</ul>}
      {canAdd && <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy)} onClick={() => void connect('google')} className="inline-flex items-center gap-2 rounded-md bg-ink px-3.5 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"><Plus size={15} />{busy === 'google' ? 'Connecting…' : 'Add Google'}</button><button type="button" disabled={Boolean(busy)} onClick={() => void connect('microsoft')} className="inline-flex items-center gap-2 rounded-md border border-border px-3.5 py-2.5 text-sm font-medium text-ink hover:bg-surface disabled:opacity-40"><Plus size={15} />{busy === 'microsoft' ? 'Connecting…' : 'Add Microsoft'}</button></div>}
      {error && <p className="mt-3 text-xs text-red-500">{error}</p>}
    </section>
    <section className="mt-6"><div className="mb-3"><h2 className="font-medium text-ink">Unified inbox</h2><p className="text-xs text-ink-faint">Newest messages from every connected account</p></div>{accounts.length === 0 ? <div className="rounded-md border border-dashed border-border py-10 text-center"><p className="text-sm text-ink-muted">Connect an email account to see messages here.</p></div> : messages.length === 0 ? <p className="rounded-md bg-surface py-8 text-center text-sm text-ink-faint">No recent inbox messages.</p> : <EmailMessageList messages={messages} />}</section>
  </div>;
}
