export function Skeleton({
  className = '',
}: {
  className?: string
}) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 ${className}`}
    />
  )
}

export function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl border border-zinc-200/60 bg-white p-3.5 shadow-2xs dark:border-zinc-800/60 dark:bg-zinc-900"
        >
          <div className="flex items-center gap-3 w-3/4">
            <Skeleton className="h-4 w-4 rounded-sm shrink-0" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-3.5 w-4/5" />
              <div className="flex gap-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            </div>
          </div>
          <Skeleton className="h-6 w-14 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

export function AgendaSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-2.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-800/50"
          >
            <div className="space-y-1.5 w-2/3">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-2.5 w-24" />
            </div>
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
      <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  )
}
