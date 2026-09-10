'use client';

import { ArrowLeft, ExternalLink, Inbox, MailOpen } from 'lucide-react';

export type InboxMessage = {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  receivedAt: string | null;
  isUnread: boolean;
  href?: string | null;
  accountId?: string;
  accountEmail?: string;
  provider?: 'google' | 'microsoft';
};

export function EmailMessageList({ messages, selectedId, onSelect }: { messages: InboxMessage[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (!messages.length) {
    return <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-raised text-ink-faint"><Inbox size={20} /></span><p className="mt-3 text-sm font-medium text-ink">Nothing in this mailbox</p><p className="mt-1 max-w-56 text-sm text-ink-faint">Try another mailbox or clear your search.</p></div>;
  }

  return <ul className="divide-y divide-border">{messages.map((message) => {
    const selected = selectedId === message.id;
    const sender = cleanSender(message.from);
    return <li key={message.id}><button type="button" onClick={() => onSelect(message.id)} className={`relative w-full px-4 py-3.5 text-left transition-colors ${selected ? 'bg-surface-raised' : 'hover:bg-surface'}`}>
      {message.isUnread && <span className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-accent" />}
      <div className="flex items-baseline justify-between gap-3"><span className={`truncate text-sm text-ink ${message.isUnread ? 'font-semibold' : 'font-medium'}`}>{sender || 'Unknown sender'}</span><span className="shrink-0 text-xs text-ink-faint">{message.receivedAt && formatDate(message.receivedAt)}</span></div>
      <p className={`mt-0.5 truncate text-sm text-ink ${message.isUnread ? 'font-semibold' : ''}`}>{message.subject || '(No subject)'}</p>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{message.snippet || 'No preview available.'}</p>
      {message.accountEmail && <p className="mt-1.5 truncate text-xs text-ink-faint">{message.accountEmail}</p>}
    </button></li>;
  })}</ul>;
}

export function EmailMessagePreview({ message, onBack }: { message: InboxMessage | null; onBack?: () => void }) {
  if (!message) return <div className="flex h-full min-h-96 flex-col items-center justify-center px-8 text-center text-ink-faint"><MailOpen size={26} strokeWidth={1.5} /><p className="mt-3 text-sm">Select a message to preview it.</p></div>;

  return <article className="h-full overflow-y-auto px-5 py-5 md:px-7 md:py-6">
    {onBack && <button type="button" onClick={onBack} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-ink-muted lg:hidden"><ArrowLeft size={16} /> Back to inbox</button>}
    <div className="border-b border-border pb-5"><h2 className="text-xl font-semibold leading-tight text-ink">{message.subject || '(No subject)'}</h2><div className="mt-4 flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{cleanSender(message.from) || 'Unknown sender'}</p><p className="mt-1 truncate text-xs text-ink-faint">to {message.accountEmail || 'you'}</p></div><time className="shrink-0 text-xs text-ink-faint">{message.receivedAt && formatFullDate(message.receivedAt)}</time></div></div>
    <p className="whitespace-pre-wrap py-6 text-sm leading-7 text-ink">{message.snippet || 'No preview text is available for this message.'}</p>
    {message.href && <a href={message.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface">Open in {message.provider === 'microsoft' ? 'Outlook' : 'Gmail'} <ExternalLink size={14} /></a>}
  </article>;
}

function cleanSender(raw: string) { return raw.replace(/<.*>/, '').replace(/^"|"$/g, '').trim() || raw; }
function formatDate(raw: string) { const date = new Date(raw); if (Number.isNaN(date.getTime())) return ''; const today = new Date(); return date.toDateString() === today.toDateString() ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function formatFullDate(raw: string) { const date = new Date(raw); return Number.isNaN(date.getTime()) ? '' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
