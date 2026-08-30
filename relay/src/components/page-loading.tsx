import { Loader2 } from 'lucide-react';

export function PageLoading({ label = 'Loading Relay…' }: { label?: string }) {
  return <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-ink-faint"><Loader2 size={16} className="animate-spin" />{label}</div>;
}
