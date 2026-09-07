'use client';

import { appPageUrl } from '@/lib/config';
import type { AppRole } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { ArrowRight, Inbox, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type RequestType = 'bug_report' | 'role_application' | 'feature_request' | 'safety_report' | 'general_feedback' | 'privacy_request';
type StaffRequest = {
  request_id: string;
  request_type: RequestType;
  subject: string;
  status: 'new' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  requester_name: string;
  requested_role: AppRole | null;
};

type StaffReport = {
  report_id: string;
  reason: string;
  status: 'submitted' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  reporter_name: string;
  reported_name: string | null;
};

type AttentionItem = {
  id: string;
  kind: 'request' | 'report';
  label: string;
  subject: string;
  detail: string;
  createdAt: string;
  href: string;
  isNew: boolean;
};

export function StaffInboxButton({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [reports, setReports] = useState<StaffReport[]>([]);
  const [loaded, setLoaded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const visibleRequests = useMemo(
    () => requests.filter((request) => visibleToRole(role, request.request_type)),
    [requests, role],
  );
  const openRequests = useMemo(
    () => visibleRequests.filter((request) => request.status === 'new' || request.status === 'reviewing'),
    [visibleRequests],
  );
  const openReports = useMemo(
    () => reports.filter((report) => report.status === 'submitted' || report.status === 'reviewing'),
    [reports],
  );
  const newCount = useMemo(
    () => visibleRequests.filter((request) => request.status === 'new').length
      + reports.filter((report) => report.status === 'submitted').length,
    [reports, visibleRequests],
  );
  const openCount = openRequests.length + openReports.length;

  const attentionItems = useMemo<AttentionItem[]>(() => {
    const requestItems: AttentionItem[] = openRequests.map((request) => ({
      id: request.request_id,
      kind: 'request',
      label: typeLabel(request.request_type),
      subject: request.subject,
      detail: `${request.requester_name}${request.requested_role ? ` · ${capitalize(request.requested_role)}` : ''}`,
      createdAt: request.created_at,
      href: '/admin/requests',
      isNew: request.status === 'new',
    }));

    const reportItems: AttentionItem[] = openReports.map((report) => ({
      id: report.report_id,
      kind: 'report',
      label: 'Moderation',
      subject: humanReason(report.reason),
      detail: `${report.reported_name ?? 'Removed account'} · reported by ${report.reporter_name}`,
      createdAt: report.created_at,
      href: '/admin?section=moderation',
      isNew: report.status === 'submitted',
    }));

    return [...requestItems, ...reportItems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [openReports, openRequests]);

  const identity = role === 'owner'
    ? { mark: '◆', label: 'Owner' }
    : role === 'admin'
      ? { mark: '◇', label: 'Admin' }
      : { mark: '●', label: 'Moderator' };

  const load = useCallback(async () => {
    if (role === 'user') return;
    const supabase = createClient() as any;
    const [requestResult, reportResult] = await Promise.all([
      supabase.rpc('staff_list_requests', {
        p_status: null,
        p_limit: 40,
        p_offset: 0,
      }),
      supabase.rpc('staff_list_reports', {
        p_status: null,
        p_limit: 40,
        p_offset: 0,
      }),
    ]);

    if (!requestResult.error) setRequests((requestResult.data ?? []) as StaffRequest[]);
    if (!reportResult.error) setReports((reportResult.data ?? []) as StaffReport[]);
    setLoaded(true);
  }, [role]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (role === 'user') return;
    const supabase = createClient() as any;
    const channel = supabase
      .channel(`staff-attention-${role}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_requests' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => void load())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, role]);

  useEffect(() => {
    if (!loaded || role === 'user') return;
    const newest = attentionItems.find((item) => item.isNew);
    if (!newest) return;

    const key = `relay-staff-attention-seen-${role}`;
    const value = `${newest.kind}:${newest.id}`;
    try {
      if (window.sessionStorage.getItem(key) !== value) {
        setOpen(true);
        window.sessionStorage.setItem(key, value);
      }
    } catch {
      // Session storage is optional. The badge still works without it.
    }
  }, [attentionItems, loaded, role]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  if (role === 'user') return null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label={`Staff attention; ${openCount} open`}
        title="Staff attention"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      >
        <Inbox size={18} />
        {newCount > 0 && (
          <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-ink px-1 text-center text-[9px] font-semibold leading-4 text-canvas">
            {newCount > 9 ? '9+' : newCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="relative overflow-hidden border-b border-border px-4 py-3.5">
            <div className="pointer-events-none absolute inset-0 opacity-[0.025] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-ink">Needs Attention</div>
                  <span className="rounded-full border border-border bg-canvas px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-ink-muted">{identity.mark} {identity.label}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-faint">
                  <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                  Live routing · {openCount} open · {newCount} new
                </div>
              </div>
              <a href={appPageUrl('/admin')} className="rounded-md border border-border bg-canvas px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised">Control Center</a>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {!loaded ? (
              <div className="px-3 py-6 text-center text-xs text-ink-muted">Loading staff attention…</div>
            ) : attentionItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-3 py-7 text-center">
                <Inbox className="mx-auto text-ink-faint" size={20} />
                <div className="mt-2 text-xs font-medium text-ink">All clear</div>
                <div className="mt-1 text-[11px] text-ink-muted">No routed requests or moderation reports need your role right now.</div>
              </div>
            ) : attentionItems.map((item) => (
              <a key={`${item.kind}:${item.id}`} href={appPageUrl(item.href)} className="group block rounded-xl px-3 py-2.5 hover:bg-surface-raised">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                    {item.isNew && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
                    {item.kind === 'report' && <ShieldAlert size={11} />}
                    {item.label}
                  </span>
                  <span className="text-[10px] text-ink-faint">{timeAgo(item.createdAt)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{item.subject}</div>
                  <ArrowRight size={12} className="shrink-0 text-ink-faint opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </div>
                <div className="mt-0.5 truncate text-xs text-ink-muted">{item.detail}</div>
              </a>
            ))}
          </div>

          <div className="grid grid-cols-2 border-t border-border">
            <a href={appPageUrl('/admin/requests')} className="flex items-center justify-center gap-2 border-r border-border px-3 py-3 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink">
              <Inbox size={13} />Requests
            </a>
            <a href={appPageUrl('/admin?section=moderation')} className="flex items-center justify-center gap-2 px-3 py-3 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink">
              <ShieldCheck size={13} />Moderation
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function visibleToRole(role: AppRole, type: RequestType) {
  if (role === 'owner') return true;
  if (role === 'admin') return ['bug_report', 'feature_request', 'safety_report', 'general_feedback'].includes(type);
  if (role === 'moderator') return type === 'safety_report';
  return false;
}

function typeLabel(type: RequestType) {
  if (type === 'bug_report') return 'Bug';
  if (type === 'role_application') return 'Role';
  if (type === 'feature_request') return 'Feature';
  if (type === 'safety_report') return 'Safety';
  if (type === 'general_feedback') return 'Feedback';
  return 'Privacy';
}

function humanReason(value: string) {
  return value.split('_').map(capitalize).join(' ');
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}
