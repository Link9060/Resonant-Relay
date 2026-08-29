import { Skeleton } from '@/components/ui/skeleton';

export default function ConversationLoading() {
  return (
    <div className="flex h-[calc(100vh-57px)] flex-col md:h-screen">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="flex-1 space-y-3 px-4 py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <Skeleton className={`h-9 ${i % 2 === 0 ? 'w-40' : 'w-28'} rounded-lg`} />
          </div>
        ))}
      </div>
      <div className="border-t border-border px-4 py-3">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
