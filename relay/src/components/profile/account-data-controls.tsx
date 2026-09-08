'use client';

import { appPageUrl } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { Download, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

type Report = { id: string; reason: string; status: string; created_at: string };
type StorageUsage = { used_bytes: number; limit_bytes: number };

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${Math.max(0, value / 1024).toFixed(value < 10240 ? 1 : 0)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function AccountDataControls() {
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [storage, setStorage] = useState<StorageUsage | null>(null);

  useEffect(() => { void (async () => {
    const supabase = createClient() as any;
    const [reportResult, storageResult] = await Promise.all([
      supabase.from('reports').select('id,reason,status,created_at').order('created_at', { ascending: false }).limit(10),
      supabase.rpc('my_storage_usage'),
    ]);
    setReports(reportResult.data ?? []);
    const row = storageResult.data?.[0];
    if (row) setStorage({ used_bytes: Number(row.used_bytes ?? 0), limit_bytes: Number(row.limit_bytes ?? 0) });
  })(); }, []);

  async function downloadData() {
    setBusy('export'); setMessage(null);
    const { data, error } = await createClient().functions.invoke('account-center', { body: { action: 'export' } });
    setBusy(null);
    if (error || !data) { setMessage('Relay could not prepare your download.'); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `relay-data-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url);
    setMessage('Your Relay data download is ready.');
  }

  async function deleteAccount() {
    if (confirmation !== 'DELETE') return;
    setBusy('delete'); setMessage(null);
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke('account-center', { body: { action: 'delete_account', confirmation } });
    if (error || !data?.ok) { setBusy(null); setMessage(data?.error ?? 'Relay could not delete your account.'); return; }
    await supabase.auth.signOut();
    window.location.assign(appPageUrl('/login'));
  }

  return <section className="mt-8 border-t border-border pt-6"><h2 className="text-sm font-medium text-ink">Your data</h2><p className="mt-1 text-xs leading-5 text-ink-faint">Download a portable JSON copy of your Relay profile, sent messages, tasks, plans, settings, and connected-account metadata. OAuth tokens are never included.</p>
    {storage && <div className="mt-4 rounded-lg border border-border bg-surface px-3.5 py-3"><div className="flex items-center justify-between gap-3 text-xs"><span className="font-medium text-ink">Attachment storage</span><span className="text-ink-muted">{formatBytes(storage.used_bytes)} of {formatBytes(storage.limit_bytes)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${Math.min(100, storage.limit_bytes ? (storage.used_bytes / storage.limit_bytes) * 100 : 0)}%` }} /></div><p className="mt-2 text-[11px] leading-4 text-ink-faint">This launch limit covers files and images you upload in Relay chats.</p></div>}
    <button type="button" disabled={Boolean(busy)} onClick={() => void downloadData()} className="mt-3 inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink hover:bg-surface disabled:opacity-50">{busy === 'export' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}Download my data</button>{message && <p className="mt-2 text-xs text-ink-muted">{message}</p>}
    {reports.length > 0 && <div className="mt-6"><h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">Your reports</h3><ul className="mt-2 divide-y divide-border rounded-md border border-border">{reports.map((report) => <li key={report.id} className="flex items-center justify-between gap-3 px-3 py-2.5"><span className="text-xs capitalize text-ink-muted">{report.reason.replaceAll('_', ' ')}</span><span className="rounded-full bg-surface px-2 py-1 text-[10px] capitalize text-ink-faint">{report.status}</span></li>)}</ul></div>}
    <div className="mt-7 rounded-lg border border-red-300/60 p-4 dark:border-red-900"><h3 className="text-sm font-medium text-red-600 dark:text-red-400">Delete account</h3><p className="mt-1 text-xs leading-5 text-ink-faint">This permanently deletes your profile and Relay data. Messages you sent are removed, and their uploaded files are deleted first. This cannot be undone.</p>{!confirming ? <button type="button" onClick={() => setConfirming(true)} className="mt-3 inline-flex items-center gap-2 rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"><Trash2 size={15} />Delete my account</button> : <div className="mt-4"><label className="text-xs text-ink-muted">Type <strong>DELETE</strong> to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="profile-input mt-1.5" autoComplete="off" /></label><div className="mt-3 flex gap-2"><button type="button" onClick={() => { setConfirming(false); setConfirmation(''); }} className="rounded-md border border-border px-3 py-2 text-xs font-medium text-ink-muted">Cancel</button><button type="button" disabled={busy === 'delete' || confirmation !== 'DELETE'} onClick={() => void deleteAccount()} className="inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">{busy === 'delete' && <Loader2 size={13} className="animate-spin" />}Permanently delete</button></div></div>}</div>
  </section>;
}
