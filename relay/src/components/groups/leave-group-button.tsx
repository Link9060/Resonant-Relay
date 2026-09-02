'use client';

import { leaveGroup } from '@/lib/actions/chats';
import { useState, useTransition } from 'react';

export function LeaveGroupButton({ groupId }: { groupId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLeave() {
    startTransition(async () => {
      const result = await leaveGroup(groupId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Leave group
        </button>
      ) : (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-right dark:border-red-900 dark:bg-red-950/30">
          <p className="text-xs font-medium text-red-800 dark:text-red-300">Leave this group?</p>
          <p className="mt-1 text-[11px] text-red-700 dark:text-red-400">You’ll lose access to its chat and plans.</p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setConfirming(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs text-ink-muted"
            >
              Keep group
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleLeave}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {isPending ? 'Leaving…' : 'Yes, leave'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
