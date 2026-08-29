import { ThemeToggle } from '@/components/theme-toggle';
import type { Profile } from '@/lib/types/database';
import { formatRelayNumber } from '@/lib/utils';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';

export function AppHeader({ profile }: { profile: Profile | null }) {
  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3 md:px-6">
      <div>
        {profile && (
          <p className="text-xs text-ink-faint">
            Your Relay: <span className="font-mono text-ink-muted">{formatRelayNumber(profile.relay_number)}</span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* Contacts is a full rail item on desktop; on mobile it's a header
            shortcut so the bottom bar can stay focused on the five daily tabs. */}
        <Link
          href="/contacts"
          aria-label="Contacts"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface hover:text-ink md:hidden"
        >
          <UserPlus size={18} />
        </Link>
        <ThemeToggle />
        <Link
          href="/profile"
          className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-surface-raised text-xs font-medium text-ink"
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            profile?.display_name?.[0]?.toUpperCase() ?? '?'
          )}
        </Link>
      </div>
    </header>
  );
}
