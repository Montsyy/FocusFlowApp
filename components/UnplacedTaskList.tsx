'use client'

import type { UnplacedTask } from '@/lib/scheduler'

interface UnplacedTaskListProps {
  unplaced: UnplacedTask[]
}

const REASON_LABELS: Record<string, string> = {
  'tidak muat': 'Slot Waktu Penuh',
  'melewati deadline': 'Melewati Deadline',
  'melebihi batas harian': 'Batas Harian (6j)',
}

export function UnplacedTaskList({ unplaced }: UnplacedTaskListProps) {
  if (unplaced.length === 0) {
    return null
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 dark:border-amber-900/50 dark:bg-amber-950/20 shadow-sm transition-all">
      <div className="flex items-center justify-between pb-2.5 border-b border-amber-200/80 dark:border-amber-900/40">
        <div className="flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
            Tugas Belum Terjadwal ({unplaced.length})
          </h4>
        </div>
        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">
          Reality Check Singkat
        </span>
      </div>

      <p className="mt-2 text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
        Tugas di bawah tidak muat di slot waktu aktif atau melewati batas yang ditentukan:
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {unplaced.map((item, idx) => {
          const reasonText = REASON_LABELS[item.reason] || item.reason
          return (
            <div
              key={item.task.id || idx}
              className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-sm border border-amber-100 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex flex-col gap-0.5 truncate pr-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {item.task.judul}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Estimasi: {item.task.durasi_menit ?? 60} menit • Kesulitan: {item.task.kesulitan ?? 3}/5
                </span>
              </div>
              <span className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                {reasonText}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
