'use client';

import { acceptConnectionRequest, cancelConnectionRequest, declineConnectionRequest } from '@/lib/actions/contacts';
import { UserRoleBadge } from '@/components/user-role-badge';
import type { AppRole } from '@/lib/role-preview';
import { useState } from 'react';

type Person = { id: string; display_name: string; avatar_url: string | null; school: string | null; role: AppRole };
type RequestAction = (requestId: string) => Promise<{ ok: true; data: undefined } | { ok: false; error: string }>;

export function RequestsList({
  incoming,
  outgoing,
}: {
  incoming: { id: string; sender: Person }[];
  outgoing: { id: string; recipient: Person }[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const visibleIncoming = incoming.filter((request) => !hiddenIds.has(request.id));
  const visibleOutgoing = outgoing.filter((request) => !hiddenIds.has(request.id));

  async function runAction(requestId: string, action: RequestAction) {
    if (busyId) return;
    setBusyId(requestId);
    setError(null);
    const result = await action(requestId);
    setBusyId(null);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setHiddenIds((current) => {
      const next = new Set(current);
      next.add(requestId);
      return next;
    });
  }

  if (visibleIncoming.length === 0 && visibleOutgoing.length === 0 && !error) return null;

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <div className="rounded-md border border-border bg-surface px-3 py-2.5 text-sm text-ink">
          {error}
        </div>
      )}

      {visibleIncoming.map((req) => (
        <div key={req.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={req.sender.display_name} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium text-ink">{req.sender.display_name}</p>
                <UserRoleBadge role={req.sender.role} />
              </div>
              <p className="text-xs text-ink-faint">wants to connect</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              disabled={busyId !== null}
              onClick={() => void runAction(req.id, acceptConnectionRequest)}
              className="rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-canvas disabled:opacity-45"
            >
              {busyId === req.id ? 'Working…' : 'Accept'}
            </button>
            <button
              disabled={busyId !== null}
              onClick={() => void runAction(req.id, declineConnectionRequest)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted disabled:opacity-45"
            >
              Decline
            </button>
          </div>
        </div>
      ))}

      {visibleOutgoing.map((req) => (
        <div key={req.id} className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={req.recipient.display_name} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium text-ink">{req.recipient.display_name}</p>
                <UserRoleBadge role={req.recipient.role} />
              </div>
              <p className="text-xs text-ink-faint">Request sent — waiting</p>
            </div>
          </div>
          <button
            disabled={busyId !== null}
            onClick={() => void runAction(req.id, cancelConnectionRequest)}
            className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted disabled:opacity-45"
          >
            {busyId === req.id ? 'Working…' : 'Cancel'}
          </button>
        </div>
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium text-ink">
      {name[0]?.toUpperCase()}
    </div>
  );
}
