'use client'

import Link from 'next/link'
import { usePlanner } from './PlannerContext'

interface QuickActionsProps {
  onAddTask: () => void
  onManageFixedEvents: () => void
  currentMinggu?: string
}

export function QuickActions({
  onAddTask,
  onManageFixedEvents,
  currentMinggu,
}: QuickActionsProps) {
  const { isGenerating, generateSchedule } = usePlanner()

  const targetMinggu =
    currentMinggu || new Date().toISOString().split('T')[0]

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Aksi Cepat
        </h3>
        <span className="text-xs">⚡</span>
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        <button
          type="button"
          disabled={isGenerating}
          onClick={() =>
            void generateSchedule({
              showCalendarLink: true,
              currentMinggu: targetMinggu,
            })
          }
          className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 p-3 text-xs font-bold text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Menyusun Jadwal AI...</span>
            </>
          ) : (
            <>
              <span className="text-base group-hover:scale-110 transition-transform">
                ✨
              </span>
              <span>Susun Jadwal Otomatis</span>
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onAddTask}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all"
          >
            <span>➕</span>
            <span>Tambah Tugas</span>
          </button>

          <button
            type="button"
            onClick={onManageFixedEvents}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all"
          >
            <span>📌</span>
            <span>Jadwal Tetap</span>
          </button>
        </div>

        <Link
          href={`/dashboard/kalender?minggu=${targetMinggu}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/70 transition-all"
        >
          <span>📅</span>
          <span>Buka Kalender Penuh</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  )
}
