import { appPageUrl } from '@/lib/config';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border text-sm font-medium text-ink">
          404
        </div>
        <h1 className="mt-6 font-display text-3xl font-medium tracking-tight text-ink">That page moved.</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted">
          This Relay route is not available. Head back to your space and continue from the dock.
        </p>
        <a
          href={appPageUrl('/')}
          className="mt-6 inline-flex rounded-md bg-ink px-4 py-2.5 text-sm font-medium text-canvas"
        >
          Back to Relay
        </a>
      </div>
    </main>
  );
}
