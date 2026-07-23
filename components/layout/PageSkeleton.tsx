import { Skeleton } from "@/components/ui/skeleton";

// Generic <Suspense> fallback for the account/collection data every page needs "now" for —
// only visible while the request-time (connection()-gated) content streams in.
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-40 shrink-0" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}
