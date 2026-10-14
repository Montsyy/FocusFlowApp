import { Suspense } from 'react'
import KalenderContent from './KalenderContent'

export default function KalenderPage(props: {
  searchParams?: Promise<{ minggu?: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Memuat kalender...
          </p>
        </div>
      }
    >
      <KalenderContent searchParams={props.searchParams} />
    </Suspense>
  )
}
