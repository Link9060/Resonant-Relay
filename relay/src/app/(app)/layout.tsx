'use client';

import { Dock } from '@/components/dock';
import { AppHeader } from '@/components/app-header';
import { PageLoading } from '@/components/page-loading';
import { appPageUrl } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { AppRole, getRolePreview, ROLE_PREVIEW_EVENT, setRolePreview } from '@/lib/role-preview';
import { useEffect, useState } from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ userId: string; profile: any; notifications: any[] } | null>(null);
  const [previewRole, setPreviewRoleState] = useState<AppRole>('user');

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { window.location.replace(appPageUrl('/login')); return; }
      const [{ data: profile }, { data: notifications }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (!active) return;
      setState({ userId: user.id, profile, notifications: notifications ?? [] });
      const actualRole = (profile?.role ?? 'user') as AppRole;
      setPreviewRoleState(getRolePreview(actualRole));
    })();

    const onPreviewChange = (event: Event) => {
      const role = (event as CustomEvent<AppRole>).detail;
      setPreviewRoleState(role);
    };
    window.addEventListener(ROLE_PREVIEW_EVENT, onPreviewChange);

    return () => {
      active = false;
      window.removeEventListener(ROLE_PREVIEW_EVENT, onPreviewChange);
    };
  }, []);

  if (!state) return <PageLoading />;

  const actualRole = (state.profile?.role ?? 'user') as AppRole;
  const effectiveRole = actualRole === 'owner' ? previewRole : actualRole;
  const isPreviewing = actualRole === 'owner' && effectiveRole !== 'owner';

  function returnToOwner() {
    setRolePreview('owner');
    setPreviewRoleState('owner');
  }

  return (
    <div className="relay-app-shell flex min-h-screen bg-canvas md:pl-60">
      <Dock role={effectiveRole} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {isPreviewing && (
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2 text-xs text-ink md:px-6">
            <span>Previewing Relay as <strong>{effectiveRole === 'user' ? 'Normal User' : effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1)}</strong>. Your real account is still Owner.</span>
            <button type="button" onClick={returnToOwner} className="shrink-0 rounded-md border border-border px-2.5 py-1 font-medium hover:bg-surface-raised">Return to Owner View</button>
          </div>
        )}
        <AppHeader profile={{ ...state.profile, role: effectiveRole }} currentUserId={state.userId} notifications={state.notifications} />
        <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
