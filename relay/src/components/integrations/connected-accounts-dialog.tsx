'use client';

import { Plus, RefreshCw, X } from 'lucide-react';

export type IntegrationProvider = 'google' | 'microsoft';

export type ConnectedAccount = {
  id: string;
  provider: IntegrationProvider;
  email_address: string;
  display_name: string | null;
  connected_at?: string;
};

type Props = {
  accounts: ConnectedAccount[];
  busy: string | null;
  error?: string | null;
  title?: string;
  accountErrors?: string[];
  onClose: () => void;
  onConnect: (provider: IntegrationProvider) => void;
  onDisconnect: (account: ConnectedAccount) => void;
};

export function ConnectedAccountsDialog({ accounts, busy, error, title = 'Connected accounts', accountErrors = [], onClose, onConnect, onDisconnect }: Props) {
  const canAdd = accounts.length < 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="connected-accounts-title" className="w-full max-w-lg rounded-xl border border-border bg-canvas shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div><h2 id="connected-accounts-title" className="text-base font-semibold text-ink">{title}</h2><p className="mt-1 text-sm text-ink-muted">{accounts.length} of 3 connected · read-only access</p></div>
          <button type="button" onClick={onClose} aria-label="Close account manager" className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"><X size={17} /></button>
        </div>
        <div className="p-5">
          {accounts.length ? <ul className="space-y-2">{accounts.map((account) => {
            const needsReconnect = accountErrors.includes(account.email_address);
            return <li key={account.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-3">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${account.provider === 'google' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}>{account.provider === 'google' ? 'G' : 'M'}</span>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{account.email_address}</p><p className={`mt-0.5 text-xs ${needsReconnect ? 'text-amber-600 dark:text-amber-400' : 'text-ink-faint'}`}>{needsReconnect ? 'Calendar permission needs reconnecting' : account.provider === 'google' ? 'Google' : 'Microsoft'}</p></div>
              {needsReconnect && <button type="button" disabled={Boolean(busy)} onClick={() => onConnect(account.provider)} className="flex h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-ink-muted hover:bg-surface-raised hover:text-ink disabled:opacity-40"><RefreshCw size={14} /> Reconnect</button>}
              <button type="button" disabled={busy === account.id} onClick={() => onDisconnect(account)} className="rounded-md px-2 py-2 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-40">{busy === account.id ? 'Removing…' : 'Remove'}</button>
            </li>;
          })}</ul> : <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center"><p className="text-sm text-ink-muted">No mail accounts connected yet.</p></div>}
          {canAdd && <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={Boolean(busy)} onClick={() => onConnect('google')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-canvas disabled:opacity-40"><Plus size={15} /> {busy === 'google' ? 'Connecting…' : 'Add Google'}</button>
            <button type="button" disabled={Boolean(busy)} onClick={() => onConnect('microsoft')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-40"><Plus size={15} /> {busy === 'microsoft' ? 'Connecting…' : 'Add Microsoft'}</button>
          </div>}
          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>
      </div>
    </div>
  );
}
