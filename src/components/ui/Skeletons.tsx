import { Skeleton } from "@/components/ui/skeleton";

export function MusicCardSkeleton() {
  return (
    <div className="rounded-xl bg-card p-4">
      <Skeleton className="aspect-square w-full rounded-lg" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-1.5 h-3 w-1/2" />
      <div className="mt-2 flex gap-1">
        <Skeleton className="h-7 w-7 rounded-full" />
        <Skeleton className="h-7 w-7 rounded-full" />
      </div>
    </div>
  );
}

export function MusicGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <MusicCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function CategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-card p-4">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="mt-1 h-3 w-14" />
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl bg-card p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="mt-3 h-8 w-24" />
      <Skeleton className="mt-1 h-4 w-16" />
    </div>
  );
}
