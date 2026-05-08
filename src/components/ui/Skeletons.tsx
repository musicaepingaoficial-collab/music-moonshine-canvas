import { Skeleton } from "@/components/ui/skeleton";

export function MusicCardSkeleton() {
  return (
    <div className="group relative overflow-hidden rounded-md bg-card">
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        <Skeleton className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-3">
          <Skeleton className="h-4 w-3/4 bg-white/20" />
          <Skeleton className="mt-2 h-3 w-1/2 bg-white/10" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full bg-white/20" />
            <Skeleton className="h-8 w-8 rounded-full bg-white/20" />
            <Skeleton className="h-8 w-8 rounded-full bg-white/20" />
          </div>
        </div>
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
