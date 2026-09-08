'use client';

import { appPageUrl, appPathname } from '@/lib/config';
import type { AppRole } from '@/lib/role-preview';
import { createClient } from '@/lib/supabase/client';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function MobileStaffAlert({ role }: { role: AppRole }) {
  const pathname = usePathname();
  const path = appPathname(pathname);
  const [openReports, setOpenReports] = useState<number | null>(null);

  useEffect(() => {
    if (role === 'user' || path !== '/') return;
    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const { data, error } = await (createClient() as any).rpc('staff_list_reports', { p_status: null, p_limit: 250, p_offset: 0 });
        if (!active || error) return;
        setOpenReports((data ?? []).filter((row: any) => row.status === 'submitted' || row.status === 'reviewing').length);
      })();
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [path, role]);

  if (role === 'user' || path !== '/' || !openReports) return null;

  return (
    <div className="px-4 pt-3 md:hidden">
      <a href={appPageUrl('/admin/moderation')} className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-ink"><AlertTriangle size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-faint">Staff · Needs attention</div>
          <div className="mt-0.5 text-sm font-medium text-ink">{openReports} open report{openReports === 1 ? '' : 's'}</div>
        </div>
        <ArrowRight size={17} className="shrink-0 text-ink-muted" />
      </a>
    </div>
  );
}
