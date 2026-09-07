'use client';

import { appPageUrl } from '@/lib/config';
import type { AppRole } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { Inbox } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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

export function StaffInboxButton({ role }: { role: AppRole }) {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(() => requests.filter((request) => visibleToRole(role, request.request_type)), [requests, role]);
  const openRequests = useMemo(() => visible.filter((request) => request.status === 'new' || request.status === 'reviewing'), [visible]);
  const newCount = useMemo(() => visible.filter((request) => request.status === 'new').length, [visible]);

  async function load() {
    if (role === 'user') return;
    const supabase = createClient() as any;
    const { data, error } = await supabase.rpc('staff_list_requests', {
      p_status: null,
      p_limit: 30,
      p_offset: 0,
    });
    if (error) {
      setLoaded(true);
      return;
    }
    setRequests((data ?? []) as StaffRequest[]);
    setLoaded(true);
  }

  useEffect(() => {
    void load();
  }, [role]);

  useEffect(() => {
    if (!loaded || role === 'user') return;
    const newest = visible.find((request) => request.status === 'new');
    if (!newest) return;

    const key = `relay-staff-inbox-seen-${role}`;
    try {
      if (window.sessionStorage.getItem(key) !== newest.request_id) {
        setOpen(true);
        window.sessionStorage.setItem(key, newest.request_id);
      }
    } catch {
      // Session storage is optional. The badge still works without it.
    }
  }, [loaded, role, visible]);

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
        aria-label="Staff inbox"
        title="Staff inbox"
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
        <div className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-ink">Staff Inbox</div>
              <div className="text-[11px] text-ink-faint">{openRequests.length} open · {newCount} new</div>
            </div>
            <a href={appPageUrl('/admin/requests')} className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-ink hover:bg-surface-raised">Open inbox</a>
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {!loaded ? (
              <div className="px-3 py-6 text-center text-xs text-ink-muted">Loading requests…</div>
            ) : openRequests.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-ink-muted">Nothing needs attention right now.</div>
            ) : openRequests.slice(0, 6).map((request) => (
              <a key={request.request_id} href={appPageUrl('/admin/requests')} className="block rounded-xl px-3 py-2.5 hover:bg-surface-raised">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-ink-faint">{typeLabel(request.request_type)}</span>
                  <span className="text-[10px] text-ink-faint">{timeAgo(request.created_at)}</span>
                </div>
                <div className="mt-1 truncate text-sm font-medium text-ink">{request.subject}</div>
                <div className="mt-0.5 truncate text-xs text-ink-muted">
                  {request.requester_name}{request.requested_role ? ` · ${capitalize(request.requested_role)}` : ''}
                </div>
              </a>
            ))}
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
