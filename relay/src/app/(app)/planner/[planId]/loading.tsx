import { Skeleton } from '@/components/ui/skeleton';

export default function PlanDetailLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-3 w-32" />
      <div className="mt-6 space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-md border border-border">
            <div className="border-b border-border px-4 py-3">
              <Skeleton className="h-3.5 w-36" />
            </div>
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
