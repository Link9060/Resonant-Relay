import type { AppRole } from '@/lib/role-preview';
import { cn } from '@/lib/utils';

const ROLE_DETAILS: Record<Exclude<AppRole, 'user'>, { label: string; mark: string }> = {
  owner: { label: 'Owner', mark: '◆' },
  admin: { label: 'Admin', mark: '◇' },
  moderator: { label: 'Moderator', mark: '●' },
};

export function UserRoleBadge({ role, className }: { role?: AppRole | null; className?: string }) {
  if (!role || role === 'user') return null;
  const detail = ROLE_DETAILS[role];

  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-canvas px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-wide text-ink-muted', className)}
      title={`Relay ${detail.label}`}
      aria-label={`Relay ${detail.label}`}
    >
      <span aria-hidden="true">{detail.mark}</span>
      {detail.label}
    </span>
  );
}
