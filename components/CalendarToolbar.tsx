'use client'

import { usePlanner } from './PlannerContext'

interface CalendarToolbarProps {
  weekTitle: string
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  currentWeekStart?: string
}

export function CalendarToolbar({
  weekTitle,
  onPrev,
  onNext,
  onToday,
  currentWeekStart,
}: CalendarToolbarProps) {
  const { isGenerating, generateSchedule } = usePlanner()

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={onPrev}
            title="Minggu Sebelumnya"
            className="rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-white hover:shadow-sm dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-lg px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-white hover:shadow-sm dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={onNext}
            title="Minggu Berikutnya"
            className="rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-white hover:shadow-sm dark:text-zinc-300 dark:hover:bg-zinc-700 transition-all"
          >
            ▶
          </button>
        </div>

        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 capitalize">
          {weekTitle}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="hidden xl:flex items-center gap-2.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
            Jadwal Tetap
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Rencana AI
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Diubah Pengguna
          </span>
          <span className="inline-flex items-center gap-1">
            🔒 Terkunci
          </span>
        </div>

        <button
          type="button"
          disabled={isGenerating}
          onClick={() =>
            void generateSchedule({
              weekStart: currentWeekStart,
              showCalendarLink: false,
              customSuccessMessage:
                'Sisa jadwal berhasil disusun ulang! Blok yang terkunci & diubah tetap dipertahankan. 🔄',
            })
          }
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-all"
        >
          {isGenerating ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
              <span>Menyusun...</span>
            </>
          ) : (
            <>
              <span>🔄</span>
              <span>Susun Ulang Sisanya</span>
            </>
          )}
        </button>

        <button
          type="button"
          disabled={isGenerating}
          onClick={() =>
            void generateSchedule({
              weekStart: currentWeekStart,
              showCalendarLink: false,
            })
          }
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 transition-all"
        >
          {isGenerating ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Menyusun...</span>
            </>
          ) : (
            <>
              <span>✨</span>
              <span>Susun Jadwal</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
