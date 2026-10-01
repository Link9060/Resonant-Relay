'use client';

import { PageLoading } from '@/components/page-loading';
import { StaffControlHeader } from '@/components/staff-control-header';
import { AppRole, getRolePreview } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { Mail, RefreshCw, Send } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Thread = {
  id: string;
  sender_email: string;
  sender_name: string | null;
  subject: string;
  status: 'new' | 'open' | 'pending' | 'closed';
  latest_message_at: string;
  created_at: string;
};

type Message = {
  id: string;
  thread_id: string;
  direction: 'inbound' | 'outbound';
  from_email: string;
  to_emails: string[];
  subject: string;
  text_body: string | null;
  created_at: string;
};

export default function AdminSupportPage() {
  const [actualRole, setActualRole] = useState<AppRole | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = actualRole === 'owner' ? getRolePreview(actualRole) : actualRole;
  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) ?? null, [threads, selectedId]);
  const canReply = role === 'admin' || role === 'owner';

  const loadThreads = useCallback(async () => {
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profileError) throw profileError;
    const nextRole = (profile?.role ?? 'user') as AppRole;
    setActualRole(nextRole);
    if (!['moderator', 'admin', 'owner'].includes(nextRole)) return;

    const { data, error: threadError } = await supabase
      .from('support_email_threads')
      .select('id,sender_email,sender_name,subject,status,latest_message_at,created_at')
      .order('latest_message_at', { ascending: false })
      .limit(100);
    if (threadError) throw threadError;
    const nextThreads = (data ?? []) as Thread[];
    setThreads(nextThreads);
    setSelectedId((current) => current && nextThreads.some((thread) => thread.id === current) ? current : (nextThreads[0]?.id ?? null));
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    const supabase = createClient() as any;
    const { data, error: messageError } = await supabase
      .from('support_email_messages')
      .select('id,thread_id,direction,from_email,to_emails,subject,text_body,created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    if (messageError) throw messageError;
    setMessages((data ?? []) as Message[]);
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => {
      void loadThreads().catch((e: any) => setError(e?.message ?? 'Support inbox could not load.'));
    }, 0);
    return () => window.clearTimeout(task);
  }, [loadThreads]);

  useEffect(() => {
    if (!selectedId) return;
    const task = window.setTimeout(() => {
      void loadMessages(selectedId).catch((e: any) => setError(e?.message ?? 'Messages could not load.'));
    }, 0);
    return () => window.clearTimeout(task);
  }, [loadMessages, selectedId]);

  async function sendReply() {
    if (!selectedId || !reply.trim() || !canReply) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient() as any;
      const { error: invokeError } = await supabase.functions.invoke('support-email', {
        body: { action: 'reply', threadId: selectedId, text: reply.trim() },
      });
      if (invokeError) throw invokeError;
      setReply('');
      await Promise.all([loadThreads(), loadMessages(selectedId)]);
    } catch (e: any) {
      setError(e?.message ?? 'Reply could not be sent.');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: Thread['status']) {
    if (!selectedId || !canReply) return;
    const supabase = createClient() as any;
    const { error: statusError } = await supabase.rpc('staff_update_support_thread', {
      p_thread_id: selectedId,
      p_status: status,
      p_assigned_to: null,
    });
    if (statusError) throw statusError;
    await loadThreads();
  }

  if (actualRole === null && !error) return <PageLoading />;
  if (!actualRole || !['moderator', 'admin', 'owner'].includes(actualRole)) {
    return <div className="mx-auto max-w-4xl px-4 py-8"><div className="rounded-xl border border-border bg-surface p-6 text-sm text-ink">Staff access required.</div></div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-7 md:px-6 md:py-8">
      <StaffControlHeader role={actualRole as Exclude<AppRole, 'user'>} active="support" />

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Support email</h2>
          <p className="mt-1 text-sm text-ink-muted">Messages sent to support@resonantrelay.org appear here.</p>
        </div>
        <button onClick={() => void loadThreads()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-muted hover:bg-surface-raised"><RefreshCw size={14}/>Refresh</button>
      </div>

      {error && <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm text-ink">{error}</div>}

      <div className="mt-5 grid min-h-[620px] gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">Inbox · {threads.length}</div>
          <div className="max-h-[680px] overflow-y-auto p-2">
            {threads.length === 0 ? <div className="p-5 text-sm text-ink-muted">No support email yet.</div> : threads.map((thread) => (
              <button key={thread.id} onClick={() => setSelectedId(thread.id)} className={`mb-1 w-full rounded-xl border p-3 text-left transition-colors ${thread.id === selectedId ? 'border-ink bg-surface-raised' : 'border-transparent hover:bg-surface-raised'}`}>
                <div className="flex items-start justify-between gap-3"><div className="truncate text-sm font-semibold text-ink">{thread.sender_name || thread.sender_email}</div><Status value={thread.status}/></div>
                <div className="mt-1 truncate text-sm text-ink-muted">{thread.subject}</div>
                <div className="mt-1 text-[11px] text-ink-faint">{new Date(thread.latest_message_at).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-ink-muted"><div><Mail className="mx-auto mb-3" size={22}/>Select a support conversation.</div></div>
          ) : (
            <>
              <div className="border-b border-border px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><h3 className="text-base font-semibold text-ink">{selected.subject}</h3><p className="mt-1 text-xs text-ink-muted">{selected.sender_name ? `${selected.sender_name} · ` : ''}{selected.sender_email}</p></div>
                  {canReply && <select value={selected.status} onChange={(e) => void setStatus(e.target.value as Thread['status']).catch((err: any) => setError(err?.message ?? 'Status update failed.'))} className="rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-ink"><option value="new">New</option><option value="open">Open</option><option value="pending">Pending</option><option value="closed">Closed</option></select>}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-canvas/40 p-4 md:p-5">
                {messages.map((message) => (
                  <div key={message.id} className={`max-w-[88%] rounded-xl border border-border p-4 ${message.direction === 'outbound' ? 'ml-auto bg-surface-raised' : 'bg-surface'}`}>
                    <div className="flex items-center justify-between gap-4 text-[11px] text-ink-faint"><span>{message.direction === 'outbound' ? 'Relay Support' : message.from_email}</span><span>{new Date(message.created_at).toLocaleString()}</span></div>
                    <div className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-ink">{message.text_body || '(No plain-text body available)'}</div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border p-4">
                {canReply ? <div className="flex gap-2"><textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} maxLength={10000} placeholder="Reply as Relay Support…" className="min-w-0 flex-1 resize-y rounded-xl border border-border bg-canvas px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"/><button disabled={busy || !reply.trim()} onClick={() => void sendReply()} className="inline-flex self-end items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-canvas disabled:opacity-50"><Send size={14}/>{busy ? 'Sending…' : 'Send'}</button></div> : <div className="text-xs text-ink-muted">Moderators can review support mail. Admin or Owner access is required to reply.</div>}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function Status({ value }: { value: Thread['status'] }) {
  return <span className="shrink-0 rounded-full border border-border bg-canvas px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-ink-faint">{value}</span>;
}
