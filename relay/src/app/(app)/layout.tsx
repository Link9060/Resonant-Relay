'use client';

import { BetaExperience } from '@/components/beta-experience';
import { DashboardPresetAccountSync } from '@/components/dashboard/dashboard-preset-account-sync';
import { FieldSemanticSync } from '@/components/field/field-semantic-sync';
import { Dock } from '@/components/dock';
import { AppHeader } from '@/components/app-header';
import { MobileRouteGate } from '@/components/mobile-route-gate';
import { MobileStaffAlert } from '@/components/mobile-staff-alert';
import { PageLoading } from '@/components/page-loading';
import { StaffCommandPaletteGlobal } from '@/components/staff-command-palette';
import { StillShortcuts } from '@/components/still-shortcuts';
import { VisualPreferencesAccountSync } from '@/components/visual-preferences-account-sync';
import { appPageUrl, IS_BETA } from '@/lib/config';
import { createClient } from '@/lib/supabase/client';
import { AppRole, getRolePreview, ROLE_PREVIEW_EVENT, setRolePreview } from '@/lib/role-preview';
import { syncVisualPreferencesWithAccount } from '@/lib/visual-preferences-account';
import { useEffect, useState, useSyncExternalStore } from 'react';

const DOCK_COLLAPSED_KEY = 'relay-dock-collapsed';
const DOCK_COLLAPSED_EVENT = 'relay-dock-collapsed-change';
const APP_LOAD_TIMEOUT_MS = 12_000;

type SupabaseResult<T> = { data: T; error: any };
type AuthUserResult = SupabaseResult<{ user: any | null }>;

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

function withTimeout<T>(promise: PromiseLike<T>, label: string, ms = APP_LOAD_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`${label} timed out`)), ms);
    Promise.resolve(promise).then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function wait(ms: number) {
  await new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ userId: string; profile: any; notifications: any[] } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [previewRole, setPreviewRoleState] = useState<AppRole>('user');
  const dockCollapsed = useSyncExternalStore(subscribeDockCollapsed, getDockCollapsedSnapshot, getServerDockCollapsedSnapshot);

  useEffect(() => {
    let active = true;
    const supabase = createClient() as any;

    async function getAuthenticatedUser() {
      let lastError: unknown = null;

      // A magic-link/OAuth callback can finish immediately before the next page
      // mounts. Prefer a server-validated user, but keep the freshly persisted
      // browser session available as a safe client-side bridge while it settles.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const result = await withTimeout<AuthUserResult>(supabase.auth.getUser(), 'Authentication');
          if (result.error) lastError = result.error;
          if (result.data.user) return result.data.user;
        } catch (error) {
          lastError = error;
        }

        try {
          const sessionResult = await withTimeout<any>(supabase.auth.getSession(), 'Session lookup', 5_000);
          const sessionUser = sessionResult?.data?.session?.user ?? null;
          if (sessionUser) {
            if (attempt > 0) {
              // Refresh once after the initial handoff so the following RLS
              // requests use the newest access token.
              await withTimeout<any>(supabase.auth.refreshSession(), 'Session refresh', 6_000).catch(() => null);
            }
            return sessionUser;
          }
          if (sessionResult?.error) lastError = sessionResult.error;
        } catch (error) {
          lastError = error;
        }

        if (attempt < 2) await wait(350 + attempt * 350);
      }

      if (lastError) throw lastError;
      return null;
    }

    async function loadAccountData(userId: string) {
      let lastProfileError: unknown = null;

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const [profileResult, notificationResult] = await withTimeout<[SupabaseResult<any>, SupabaseResult<any[]>]>(
          Promise.all([
            supabase.from('profiles').select('*').eq('id', userId).single(),
            supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
          ]),
          'Relay account data',
        );

        if (profileResult.data && !profileResult.error) {
          return { profileResult, notificationResult };
        }

        lastProfileError = profileResult.error ?? new Error('Your Relay profile could not be loaded.');

        if (attempt < 2) {
          if (attempt === 0) {
            await withTimeout<any>(supabase.auth.refreshSession(), 'Session refresh', 6_000).catch(() => null);
          }
          await wait(400 + attempt * 450);
        }
      }

      throw lastProfileError ?? new Error('Your Relay profile could not be loaded.');
    }

    void (async () => {
      setLoadError(null);
      let loadStage = 'authentication';
      try {
        const user = await getAuthenticatedUser();
        if (!active) return;
        if (!user) {
          window.location.replace(appPageUrl('/login'));
          return;
        }

        if (IS_BETA) {
          loadStage = 'beta access';
          const { data: betaAccess, error: betaError } = await withTimeout<SupabaseResult<any>>(
            supabase.rpc('beta_access_status'),
            'Beta access check',
          );
          if (!active) return;
          if (betaError) throw betaError;
          if (!betaAccess?.approved) {
            window.location.replace(appPageUrl('/beta-access'));
            return;
          }
        }

        loadStage = 'account profile';
        const { profileResult, notificationResult } = await loadAccountData(user.id);
        if (!active) return;

        const profile = profileResult.data;
        if (!profile.onboarding_completed_at) {
          window.location.replace(appPageUrl('/onboarding'));
          return;
        }

        // Layout, experience and palette are account preferences. Resolve them
        // before exposing the app shell so another account's browser cache can
        // never become this user's starting appearance.
        loadStage = 'visual preferences';
        try {
          await syncVisualPreferencesWithAccount(user.id);
        } catch (error) {
          console.error('Relay visual preference sync failed; using defaults', error);
        }
        if (!active) return;

        setState({
          userId: user.id,
          profile,
          notifications: notificationResult.error ? [] : (notificationResult.data ?? []),
        });
        const actualRole = (profile.role ?? 'user') as AppRole;
        setPreviewRoleState(getRolePreview(actualRole));
      } catch (error) {
        if (!active) return;
        console.error('Relay app-shell load failed', { stage: loadStage, error });
        setLoadError(
          loadStage === 'authentication'
            ? 'Relay signed you in, but the session did not finish loading. Retry once; if it still fails, sign in again.'
            : 'Relay could not finish loading your account. Retry once; your data was not changed.',
        );
      }
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

  if (loadError) {
    return (
      <BetaExperience>
        <main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-ink">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center">
            <div className="font-display text-2xl font-medium tracking-tight">Relay had trouble loading</div>
            <p className="mt-3 text-sm leading-6 text-ink-muted">{loadError}</p>
            <div className="mt-5 flex justify-center gap-2">
              <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-md bg-ink px-4 text-sm font-medium text-canvas">Retry</button>
              <button type="button" onClick={() => void leaveDisabledAccount()} className="min-h-11 rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-surface-raised">Sign out</button>
            </div>
          </div>
        </main>
      </BetaExperience>
    );
  }

  if (!state) return <BetaExperience><PageLoading /></BetaExperience>;

  if (state.profile?.banned_at) {
    return (
      <BetaExperience>
        <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center">
            <div className="font-display text-2xl font-medium tracking-tight text-ink">Relay account disabled</div>
            <p className="mt-3 text-sm text-ink-muted">This account has been banned from Relay and cannot use the app right now.</p>
            {state.profile?.ban_reason && <div className="mt-4 rounded-lg border border-border bg-canvas px-4 py-3 text-left text-sm text-ink-muted">Reason: {state.profile.ban_reason}</div>}
            <button type="button" onClick={() => void leaveDisabledAccount()} className="mt-5 min-h-11 rounded-md border border-border px-4 text-sm font-medium text-ink hover:bg-surface-raised">Sign out</button>
          </div>
        </main>
      </BetaExperience>
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
    <BetaExperience>
      <DashboardPresetAccountSync />
      <FieldSemanticSync />
      <VisualPreferencesAccountSync userId={state.userId} />
      <div data-dock-collapsed={dockCollapsed} className={`relay-app-shell flex min-h-screen bg-canvas transition-[padding] duration-200 ${dockCollapsed ? 'md:pl-16' : 'md:pl-60'}`}>
        <Dock role={effectiveRole} collapsed={dockCollapsed} onCollapsedChange={handleDockCollapsedChange} onboardingCompletedAt={state.profile?.onboarding_completed_at ?? null} />
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
        </div>
        <StillShortcuts />
        <StaffCommandPaletteGlobal key={effectiveRole} role={effectiveRole} />
      </div>
    </BetaExperience>
  );
}
