'use client';

export function SignOutButton() {
  function handleSignOut() {
    window.location.assign('https://enterarrow.com/signout/');
  }

  return (
    <button
      onClick={handleSignOut}
      className="w-full rounded-md border border-border py-2.5 text-sm font-medium text-ink-muted hover:bg-surface"
    >
      Sign out
    </button>
  );
}
