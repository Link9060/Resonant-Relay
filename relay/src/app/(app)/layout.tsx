'use client';

import { Dock } from '@/components/dock';
import { AppHeader } from '@/components/app-header';
import { MobileRouteGate } from '@/components/mobile-route-gate';
import { MobileStaffAlert } from '@/components/mobile-staff-alert';
import { PageLoading } from '@/components/page-loading';
import { appPageUrl, appPathname, IS_BETA } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { AppRole, getRolePreview, ROLE_PREVIEW_EVENT, setRolePreview } from '@/lib/role-preview';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
  const isPublicHome = !IS_BETA && appPathname(pathname) === '/';
  const [state, setState] = useState<{ userId: string; profile: any; notifications: any[] } | null>(null);
  const [previewRole, setPreviewRoleState] = useState<AppRole>('user');
  const dockCollapsed = useSyncExternalStore(subscribeDockCollapsed, getDockCollapsedSnapshot, getServerDockCollapsedSnapshot);

  useEffect(() => {
    let active = true;
    const supabase = createClient() as any;
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        // Keep the production homepage publicly accessible for visitors and
        // OAuth verification. Protected app routes still go to sign-in.
        if (isPublicHome) return;
        window.location.replace(appPageUrl('/login'));
        return;
      }

      if (IS_BETA) {
        const { data: betaAccess, error: betaError } = await supabase.rpc('beta_access_status');
        if (!active) return;
        if (betaError || !betaAccess?.approved) {
          window.location.replace(appPageUrl('/beta-access'));
          return;
        }
      }

      const [{ data: profile }, { data: notifications }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (!active) return;
      if (!profile?.onboarding_completed_at) {
        window.location.replace(appPageUrl('/onboarding'));
        return;
      }
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
  }, [isPublicHome]);

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

  // On production, the signed-out root is a real public app homepage rather
  // than a login-only screen. Signed-in users still get their normal dashboard.
  if (!state) {
    if (isPublicHome) return <PublicHomepage />;
    return <PageLoading />;
  }

  if (state.profile?.banned_at) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center">
          <div className="font-display text-2xl font-medium tracking-tight text-ink">Relay account disabled</div>
          <p className="mt-3 text-sm text-ink-muted">This account has been banned from Relay and cannot use the app right now.</p>
          {state.profile?.ban_reason && <div className="mt-4 rounded-lg border border-border bg-canvas px-4 py-3 text-left text-sm text-ink-muted">Reason: {state.profile.ban_reason}</div>}
          <button type="button" onClick={() => void leaveDisabledAccount()} className="mt-5 min-h-11 rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-surface-raised">Sign out</button>
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
        <MobileStaffAlert role={effectiveRole} />
        <main className="relay-mobile-main min-w-0 flex-1 md:pb-0">
          <MobileRouteGate role={effectiveRole}>{children}</MobileRouteGate>
        </main>
        <footer className="border-t border-border px-4 py-4 text-center text-[11px] text-ink-faint md:px-6">
          <a href={appPageUrl('/privacy')} className="underline underline-offset-4 hover:text-ink">Privacy Policy</a>
          <span className="mx-2" aria-hidden="true">·</span>
          <a href={appPageUrl('/terms')} className="underline underline-offset-4 hover:text-ink">Terms of Use</a>
        </footer>
      </div>
    </div>
  );
}

function PublicHomepage() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-10 text-ink">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-border pb-5">
          <div className="font-display text-2xl font-medium tracking-tight">Relay</div>
          <a href={appPageUrl('/login')} className="rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-canvas">Sign in</a>
        </header>

        <section className="flex flex-1 flex-col justify-center py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">Resonant Relay</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl font-medium tracking-tight sm:text-5xl">Communication and planning, without the clutter.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-ink-muted">Relay brings conversations, tasks, group plans, notifications, connected email summaries, and calendar events into one place so users can organize their day and stay in touch.</p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-muted">Google and Microsoft connections are optional. Relay&apos;s current Google integration uses read-only Gmail and read-only Calendar access to show connected inbox information and upcoming events inside Relay.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={appPageUrl('/login')} className="rounded-md bg-ink px-5 py-3 text-sm font-medium text-canvas">Open Relay</a>
            <a href={appPageUrl('/privacy')} className="rounded-md border border-border px-5 py-3 text-sm font-medium text-ink hover:bg-surface-raised">Privacy Policy</a>
          </div>
        </section>

        <footer className="border-t border-border py-5 text-xs text-ink-faint">
          <span>Relay · </span>
          <a href={appPageUrl('/privacy')} className="underline underline-offset-4 hover:text-ink">Privacy Policy</a>
          <span className="mx-2" aria-hidden="true">·</span>
          <a href={appPageUrl('/terms')} className="underline underline-offset-4 hover:text-ink">Terms of Use</a>
        </footer>
      </div>
    </main>
  );
}
