import { Skeleton } from '@/components/ui/skeleton';

export default function EmailLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5 px-3 py-3">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-64" />
          </div>
        ))}
      </div>
    </div>
  );
}
