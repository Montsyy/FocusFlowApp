'use client'

import type { Task } from '@/lib/types'
import { calculateCompletionRate } from '@/lib/selectors/tasks'

interface StatCardsProps {
  tasks: Task[]
}

export function StatCards({ tasks }: StatCardsProps) {
  const rate = calculateCompletionRate(tasks)
  const completedCount = tasks.filter(
    (t) => t.status === 'done' || (t.status as string) === 'selesai'
  ).length

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Tingkat Penyelesaian
        </h3>
        <span className="text-xs">🎯</span>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
            {rate}%
          </span>
          <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            {completedCount} / {tasks.length} selesai
          </span>
        </div>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all duration-500"
            style={{ width: `${rate}%` }}
          />
        </div>

        <p className="mt-2.5 text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {rate === 100 && tasks.length > 0
            ? 'Luar biasa! Semua tugas minggu ini telah diselesaikan.'
            : rate >= 50
              ? 'Progres solid! Pertahankan ritme kerja Anda hingga akhir pekan.'
              : 'Fokus pada prioritas utama untuk meningkatkan capaian mingguan Anda.'}
        </p>
      </div>
    </div>
  )
}
