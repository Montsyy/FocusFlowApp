import { Suspense } from 'react'
import DashboardContent from './DashboardContent'

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Memuat dashboard...
          </p>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  )
}
