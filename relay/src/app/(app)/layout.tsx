'use client';

import { Dock } from '@/components/dock';
import { AppHeader } from '@/components/app-header';
import { PageLoading } from '@/components/page-loading';
import { appPageUrl } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { AppRole, getRolePreview, ROLE_PREVIEW_EVENT, setRolePreview } from '@/lib/role-preview';
import { useEffect, useState, useSyncExternalStore } from 'react';

const DOCK_COLLAPSED_KEY = 'relay-dock-collapsed';
const DOCK_COLLAPSED_EVENT = 'relay-dock-collapsed-change';

function subscribeDockCollapsed(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(DOCK_COLLAPSED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(DOCK_COLLAPSED_EVENT, onStoreChange);
  };
}

function getDockCollapsedSnapshot() {
  try {
    return window.localStorage.getItem(DOCK_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function getServerDockCollapsedSnapshot() {
  return false;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ userId: string; profile: any; notifications: any[] } | null>(null);
  const [previewRole, setPreviewRoleState] = useState<AppRole>('user');
  const dockCollapsed = useSyncExternalStore(
    subscribeDockCollapsed,
    getDockCollapsedSnapshot,
    getServerDockCollapsedSnapshot,
  );

  useEffect(() => {
    let active = true;
    // The runtime schema includes profiles.role and moderation fields, while the
    // checked-in generated types still lag those migrations.
    const supabase = createClient() as any;
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

  function handleDockCollapsedChange(next: boolean) {
    try {
      window.localStorage.setItem(DOCK_COLLAPSED_KEY, next ? '1' : '0');
      window.dispatchEvent(new Event(DOCK_COLLAPSED_EVENT));
    } catch {
      // Storage can be unavailable in strict/private browser contexts.
    }
  }

  async function leaveDisabledAccount() {
    try {
      await createClient().auth.signOut();
    } finally {
      window.location.replace(appPageUrl('/login'));
    }
  }

  if (!state) return <PageLoading />;

  if (state.profile?.banned_at) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center">
          <div className="font-display text-2xl font-medium tracking-tight text-ink">Relay account disabled</div>
          <p className="mt-3 text-sm text-ink-muted">This account has been banned from Relay and cannot use the app right now.</p>
          {state.profile?.ban_reason && (
            <div className="mt-4 rounded-lg border border-border bg-canvas px-4 py-3 text-left text-sm text-ink-muted">
              Reason: {state.profile.ban_reason}
            </div>
          )}
          <button type="button" onClick={() => void leaveDisabledAccount()} className="mt-5 rounded-md border border-border px-4 py-2 text-sm font-medium text-ink hover:bg-surface-raised">Sign out</button>
        </div>
      </main>
    );
  }

  const actualRole = (state.profile?.role ?? 'user') as AppRole;
  const effectiveRole = actualRole === 'owner' ? previewRole : actualRole;
  const isPreviewing = actualRole === 'owner' && effectiveRole !== 'owner';

  function returnToOwner() {
    setRolePreview('owner');
    setPreviewRoleState('owner');
  }

  return (
    <div className={`relay-app-shell flex min-h-screen bg-canvas transition-[padding] duration-200 ${dockCollapsed ? 'md:pl-16' : 'md:pl-60'}`}>
      <Dock role={effectiveRole} collapsed={dockCollapsed} onCollapsedChange={handleDockCollapsedChange} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {isPreviewing && (
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-2 text-xs text-ink md:px-6">
            <span>Previewing Relay as <strong>{effectiveRole === 'user' ? 'Normal User' : effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1)}</strong>. Your real account is still Owner.</span>
            <button type="button" onClick={returnToOwner} className="shrink-0 rounded-md border border-border px-2.5 py-1 font-medium hover:bg-surface-raised">Return to Owner View</button>
          </div>
        )}
        <AppHeader profile={{ ...state.profile, role: effectiveRole }} role={effectiveRole} currentUserId={state.userId} notifications={state.notifications} />
        <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>
      </div>
    </div>
  );
}
