import { appPageUrl } from '@/lib/config';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border text-sm font-medium text-ink">
          404
        </div>
        <h1 className="mt-6 font-display text-3xl font-medium tracking-tight text-ink">Page not found.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          This address does not point to an available Relay page. Your account and data are unaffected.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <a href={appPageUrl('/')} className="inline-flex rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-canvas">Dashboard</a>
          <a href={appPageUrl('/chats')} className="inline-flex rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink">Chats</a>
          <a href={appPageUrl('/support')} className="inline-flex rounded-md border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink">Support</a>
        </div>
      </div>
    </main>
  );
}
