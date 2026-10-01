import { NotificationBell } from '@/components/notifications/notification-bell';
import { StaffInboxButton } from '@/components/staff/staff-inbox-button';
import { appPageUrl, BASE_PATH, COMPACT_RELEASE_LABEL, RELEASE_LABEL } from '@/lib/config';
import type { AppRole } from '@/lib/role-preview';
import type { Notification, Profile } from '@/lib/types/database';
import { cn, formatRelayNumber } from '@/lib/utils';
import { MessageSquarePlus, ShieldCheck } from 'lucide-react';

export function AppHeader({ profile, role, currentUserId, notifications }: { profile: Profile | null; role: AppRole; currentUserId: string; notifications: Notification[] }) {
  const staffIdentity = role === 'owner' ? { mark:'◆',label:'Owner' } : role === 'admin' ? { mark:'◇',label:'Admin' } : role === 'moderator' ? { mark:'●',label:'Moderator' } : null;
  return <header className="relay-app-header flex min-h-14 items-center justify-between border-b border-border px-4 py-2.5 md:px-6 md:py-3"><div className="flex min-w-0 items-center gap-2"><a href={appPageUrl('/space')} aria-label="Return to particle landing page" className="beta-mobile-home"><img src={`${BASE_PATH}/relay-icon.svg`} alt="" className="h-6 w-6" /></a>{profile&&<p className="truncate text-xs text-ink-faint"><span className="hidden sm:inline">Your Relay: </span><span className="font-mono text-ink-muted">{formatRelayNumber(profile.relay_number)}</span></p>}<span title={RELEASE_LABEL} aria-label={RELEASE_LABEL} className={cn('max-w-[7.5rem] shrink-0 truncate rounded-full border border-ink-muted bg-ink px-1.5 py-0.5 text-[9px] font-medium leading-none text-canvas')}>{COMPACT_RELEASE_LABEL}</span></div><div className="flex shrink-0 items-center gap-1"><NotificationBell currentUserId={currentUserId} initial={notifications}/><div data-arrow-os-shell data-module="relay" data-orbit-access="enabled" suppressHydrationWarning /></div></header>;
}
