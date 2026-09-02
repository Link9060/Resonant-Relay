'use client';

import { ChevronDown, ExternalLink, MailOpen } from 'lucide-react';
import { useState } from 'react';

type InboxMessage = { id: string; subject: string; from: string; snippet: string; receivedAt: string | null; isUnread: boolean };

export function EmailMessageList({ messages }: { messages: InboxMessage[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return <ul className="divide-y divide-border rounded-md border border-border">{messages.map((message) => { const selected = selectedId === message.id; return <li key={message.id}><button type="button" onClick={() => setSelectedId(selected ? null : message.id)} aria-expanded={selected} className="w-full px-3 py-3 text-left transition-colors hover:bg-surface"><div className="flex items-center justify-between gap-3"><span className={`truncate text-sm text-ink ${message.isUnread ? 'font-semibold' : ''}`}>{message.subject}</span><span className="flex shrink-0 items-center gap-2 text-xs text-ink-faint">{message.receivedAt && formatDate(message.receivedAt)}<ChevronDown size={14} className={`transition-transform ${selected ? 'rotate-180' : ''}`} /></span></div><p className="mt-0.5 truncate text-xs text-ink-faint">{message.from.replace(/<.*>/, '').trim() || message.from}</p>{!selected && <p className="mt-1 truncate text-xs text-ink-muted">{message.snippet}</p>}</button>{selected && <div className="border-t border-border bg-surface px-3 pb-4 pt-3"><div className="flex items-center gap-2 text-xs text-ink-faint"><MailOpen size={14} />Message preview</div><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink">{message.snippet || 'No preview text is available for this message.'}</p><a href={`https://mail.google.com/mail/u/0/#all/${encodeURIComponent(message.id)}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-ink underline underline-offset-4">Open in Gmail <ExternalLink size={12} /></a></div>}</li>; })}</ul>;
}

function formatDate(raw: string) { const date = new Date(raw); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
