'use client';

import { acceptConnectionRequest, cancelConnectionRequest, declineConnectionRequest } from '@/lib/actions/contacts';
import { UserRoleBadge } from '@/components/user-role-badge';
import type { AppRole } from '@/lib/role-preview';
import { useTransition } from 'react';

type Person = { id: string; display_name: string; avatar_url: string | null; school: string | null; role: AppRole };

export function RequestsList({
  incoming,
  outgoing,
}: {
  incoming: { id: string; sender: Person }[];
  outgoing: { id: string; recipient: Person }[];
}) {
  const [isPending, startTransition] = useTransition();

  if (incoming.length === 0 && outgoing.length === 0) return null;

  return (
    <div className="mt-6 space-y-4">
      {incoming.map((req) => (
        <div key={req.id} className="flex items-center justify-between rounded-md border border-border p-3">
          <div className="flex items-center gap-3">
            <Avatar name={req.sender.display_name} />
            <div>
              <div className="flex items-center gap-1.5"><p className="text-sm font-medium text-ink">{req.sender.display_name}</p><UserRoleBadge role={req.sender.role} /></div>
              <p className="text-xs text-ink-faint">wants to connect</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await acceptConnectionRequest(req.id); if (result.ok) window.location.reload();
                })
              }
              className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-canvas"
            >
              Accept
            </button>
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await declineConnectionRequest(req.id); if (result.ok) window.location.reload();
                })
              }
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted"
            >
              Decline
            </button>
          </div>
        </div>
      ))}

      {outgoing.map((req) => (
        <div key={req.id} className="flex items-center justify-between rounded-md border border-border p-3">
          <div className="flex items-center gap-3">
            <Avatar name={req.recipient.display_name} />
            <div>
              <div className="flex items-center gap-1.5"><p className="text-sm font-medium text-ink">{req.recipient.display_name}</p><UserRoleBadge role={req.recipient.role} /></div>
              <p className="text-xs text-ink-faint">Request sent — waiting</p>
            </div>
          </div>
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await cancelConnectionRequest(req.id); if (result.ok) window.location.reload();
              })
            }
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted"
          >
            Cancel
          </button>
        </div>
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-xs font-medium text-ink">
      {name[0]?.toUpperCase()}
    </div>
  );
}
