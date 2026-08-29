'use client';

import { disconnectGoogle } from '@/lib/actions/student-hub';
import type { GoogleService } from '@/lib/google/scopes';
import { useTransition } from 'react';

export function DisconnectGoogleButton({ service }: { service: GoogleService }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => disconnectGoogle(service))}
      className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface disabled:opacity-40"
    >
      Disconnect
    </button>
  );
}
