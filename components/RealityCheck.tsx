'use client'

interface RealityCheckProps {
  totalEstimatedMinutes?: number
}

export function RealityCheck({ totalEstimatedMinutes = 90 }: RealityCheckProps) {
  const availableHours = 28
  const estimatedHours = Math.round((totalEstimatedMinutes / 60) * 10) / 10
  const ratioPercent = Math.min(Math.round((estimatedHours / availableHours) * 100), 100)

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Reality Check Mingguan
        </h3>
        <span className="text-xs">⚖️</span>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-zinc-500">Beban Waktu</span>
          <span className="text-indigo-600 dark:text-indigo-400">
            {estimatedHours}j / {availableHours}j kapasitas
          </span>
        </div>

        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${ratioPercent || 15}%` }}
          />
        </div>

        <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          {ratioPercent > 80
            ? 'Peringatan: Jadwal hampir penuh! Pertimbangkan mendelegasikan atau menjadwalkan ulang.'
            : 'Kapasitas aman: Rencana mingguan Anda realistis dan tidak melebihi batas wajar.'}
        </p>
      </div>
    </div>
  )
}
