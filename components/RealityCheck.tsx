'use client'

import { usePlanner } from './PlannerContext'
import { UnplacedDecisionList } from './UnplacedDecisionList'
import type { UnplacedTask } from '@/lib/scheduler'

export interface RealityCheckProps {
  totalRequiredMinutes?: number
  totalAvailableMinutes?: number
  totalEstimatedMinutes?: number
  unplacedTasks?: UnplacedTask[]
  onTaskUpdated?: () => void
  variant?: 'full' | 'compact'
  onOpenUnplacedDrawer?: () => void
}

export function RealityCheck({
  totalRequiredMinutes,
  totalAvailableMinutes,
  totalEstimatedMinutes,
  unplacedTasks: propsUnplaced,
  onTaskUpdated,
  variant = 'full',
  onOpenUnplacedDrawer,
}: RealityCheckProps) {
  const { capacity, unplacedTasks: contextUnplaced, isGenerating, replanToday } = usePlanner()

  const unplacedList = propsUnplaced ?? contextUnplaced ?? []

  const reqMin =
    totalRequiredMinutes !== undefined
      ? totalRequiredMinutes
      : capacity?.totalRequiredMinutes !== undefined
      ? capacity.totalRequiredMinutes
      : totalEstimatedMinutes !== undefined
      ? totalEstimatedMinutes
      : 0

  const availMin =
    totalAvailableMinutes !== undefined
      ? totalAvailableMinutes
      : capacity?.totalAvailableMinutes !== undefined
      ? capacity.totalAvailableMinutes
      : 1680

  const isOverloaded = reqMin > availMin
  const reqHours = Math.round((Math.max(0, reqMin) / 60) * 10) / 10
  const availHours = Math.round((Math.max(0, availMin) / 60) * 10) / 10
  const diffHours = Math.max(0, Math.round(((reqMin - availMin) / 60) * 10) / 10)

  const ratioPercent = Math.min(
    100,
    Math.max(0, Math.round((reqMin / Math.max(1, availMin)) * 100))
  )

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            ⚖️ Kapasitas:
          </span>
          <span
            className={`font-bold ${
              isOverloaded
                ? 'text-red-600 dark:text-red-400'
                : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {reqHours}j / {availHours}j kapasitas ({ratioPercent}%)
          </span>

          <div className="h-2 w-28 sm:w-40 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full transition-all duration-500 ${
                isOverloaded
                  ? 'bg-red-500'
                  : 'bg-gradient-to-r from-blue-600 to-emerald-500'
              }`}
              style={{ width: `${ratioPercent}%` }}
            />
          </div>

          {isOverloaded && (
            <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
              +{diffHours}j
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unplacedList.length > 0 && onOpenUnplacedDrawer && (
            <button
              type="button"
              onClick={onOpenUnplacedDrawer}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 hover:bg-amber-200 dark:bg-amber-900/60 dark:text-amber-200 dark:hover:bg-amber-900/80 transition-all"
            >
              <span>⚠️</span>
              <span>{unplacedList.length} Perlu Keputusan</span>
            </button>
          )}

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void replanToday()}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 transition-all"
            title="Susun ulang sisa slot hari ini mulai dari jam sekarang"
          >
            <span>🚨</span>
            <span>{isGenerating ? 'Menyusun...' : 'Hari Ini Kacau'}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">⚖️</span>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Reality Check
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Kapasitas & beban tugas
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={isGenerating}
          onClick={() => void replanToday()}
          className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap rounded-xl border border-red-200 bg-red-50/80 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 transition-all"
          title="Susun ulang sisa slot hari ini mulai dari jam sekarang"
        >
          <span>🚨</span>
          <span>{isGenerating ? 'Menyusun...' : 'Hari Ini Kacau'}</span>
        </button>
      </div>

      <div
        className={`rounded-xl border p-4 transition-all ${
          isOverloaded
            ? 'border-red-200 bg-red-50/80 dark:border-red-900/50 dark:bg-red-950/30'
            : 'border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-800/40'
        }`}
      >
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className={isOverloaded ? 'text-red-800 dark:text-red-200' : 'text-zinc-500 dark:text-zinc-400'}>
            {isOverloaded ? '⚠️ Peringatan: Beban Melebihi Kapasitas' : 'Beban Waktu'}
          </span>
          <span
            className={`font-bold ${
              isOverloaded
                ? 'text-red-700 dark:text-red-300'
                : 'text-blue-600 dark:text-blue-400'
            }`}
          >
            {reqHours}j / {availHours}j kapasitas {isOverloaded && `(+${diffHours}j)`}
          </span>
        </div>

        <div className="mt-2.5 h-3 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOverloaded
                ? 'bg-gradient-to-r from-amber-500 to-red-500'
                : 'bg-gradient-to-r from-blue-600 to-emerald-500'
            }`}
            style={{ width: `${ratioPercent}%` }}
          />
        </div>

        <p
          className={`mt-2.5 text-[11px] leading-relaxed ${
            isOverloaded
              ? 'text-red-700 dark:text-red-300 font-medium'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          {isOverloaded
            ? 'Peringatan: Jadwal hampir penuh! Waktu yang dibutuhkan melebihi jam aktif yang tersedia minggu ini. Ambil tindakan pada daftar di bawah.'
            : ratioPercent > 80
            ? 'Peringatan: Jadwal hampir penuh! Pertimbangkan mendelegasikan atau menjadwalkan ulang.'
            : 'Kapasitas aman: Rencana mingguan Anda realistis dan tidak melebihi batas wajar.'}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <span>Perlu Keputusan Manusia</span>
            {unplacedList.length > 0 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                {unplacedList.length}
              </span>
            )}
          </h4>
        </div>

        <UnplacedDecisionList
          unplaced={unplacedList}
          onTaskUpdated={onTaskUpdated}
        />
      </div>
    </div>
  )
}
