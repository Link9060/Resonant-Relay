'use client';

import { appPageUrl } from '@/lib/config';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-canvas p-6 text-ink">
    <section className="max-w-md rounded-xl border border-border bg-surface p-6">
      <h1 className="text-xl font-semibold">This page could not load</h1>
      <p className="mt-3 text-sm text-ink-muted">Try again to reload this page. Any changes that were not confirmed may still need saving.</p>
      <div className="mt-5 flex gap-3"><button type="button" onClick={reset} className="rounded-md bg-ink px-4 py-3 text-sm text-canvas">Try again</button><a className="rounded-md border border-border px-4 py-3 text-sm" href={appPageUrl('/')}>Open Relay</a></div>
    </section>
  </main>;
}
