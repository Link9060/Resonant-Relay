import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { StaffInboxButton } from '@/components/staff/staff-inbox-button';
import { appPageUrl, IS_BETA, RELEASE_LABEL } from '@/lib/config';
import type { AppRole } from '@/lib/role-preview';
import type { Notification, Profile } from '@/lib/types/database';
import { cn, formatRelayNumber } from '@/lib/utils';
import { Activity, MessageSquarePlus, UserPlus, Users } from 'lucide-react';

export function AppHeader({
  profile,
  role,
  currentUserId,
  notifications,
}: {
  profile: Profile | null;
  role: AppRole;
  currentUserId: string;
  notifications: Notification[];
}) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        {profile && (
          <p className="truncate text-xs text-ink-faint">
            Your Relay: <span className="font-mono text-ink-muted">{formatRelayNumber(profile.relay_number)}</span>
          </p>
        )}
        <span
          className={cn(
            'shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium leading-none',
            IS_BETA
              ? 'border-ink-muted bg-ink text-canvas'
              : 'hidden border-border bg-surface-raised text-ink-faint sm:inline-flex'
          )}
        >
          {RELEASE_LABEL}
        </span>
      </div>
      <div className="flex items-center gap-1">
        {/* Contacts is a full rail item on desktop. On mobile, keep Contacts and
            Add Friend together in the top bar so both are always discoverable. */}
        <a
          href={appPageUrl('/contacts')}
          aria-label="Contacts"
          title="Contacts"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink md:hidden"
        >
          <Users size={18} />
        </a>
        <a
          href={appPageUrl('/contacts/add')}
          aria-label="Add friend"
          title="Add friend"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink md:hidden"
        >
          <UserPlus size={18} />
        </a>
        <a
          href={appPageUrl('/support')}
          aria-label="Support and feedback"
          title="Support & Feedback"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <MessageSquarePlus size={18} />
        </a>
        {role === 'owner' && (
          <a
            href={appPageUrl('/admin/activity')}
            aria-label="Owner activity"
            title="Owner Activity"
            className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <Activity size={18} />
          </a>
        )}
        <StaffInboxButton role={role} />
        <NotificationBell currentUserId={currentUserId} initial={notifications} />
        <ThemeToggle />
        <a
          href={appPageUrl('/profile')}
          className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-xs font-medium text-ink"
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            profile?.display_name?.[0]?.toUpperCase() ?? '?'
          )}
        </a>
      </div>
    </header>
  );
}
