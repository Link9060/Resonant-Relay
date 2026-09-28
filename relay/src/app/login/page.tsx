'use client';

import { useEffect } from 'react';

export default function LoginPage() {
  useEffect(() => {
    const target = new URL('https://enterarrow.com/');
    target.searchParams.set('next', '/relay/');
    window.location.replace(target.toString());
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-6">
      <p className="text-sm text-ink-muted">Opening ARROW sign in…</p>
    </main>
  );
}
