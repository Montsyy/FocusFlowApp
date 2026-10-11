import { Suspense } from 'react'
import RefleksiContent from './RefleksiContent'

export default function RefleksiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Memuat refleksi...
          </p>
        </div>
      }
    >
      <RefleksiContent />
    </Suspense>
  )
}
