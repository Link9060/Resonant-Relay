'use client';

import { appPageUrl } from '@/lib/config';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';

// A full page is intentionally used instead of a portal/dialog. Static GitHub
// Pages navigation is more reliable across iPhone Safari, installed web apps,
// and desktop browsers when the form owns its own URL.
export function AddPersonDialog() {
  return (
    <Link
      href={appPageUrl('/contacts/add')}
      prefetch
      className="flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-canvas transition-all hover:opacity-90 active:scale-[0.97]"
    >
      <UserPlus size={16} />
      Add person
    </Link>
  );
}
