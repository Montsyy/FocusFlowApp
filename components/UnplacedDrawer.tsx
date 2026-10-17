'use client'

import { UnplacedDecisionList } from './UnplacedDecisionList'
import type { UnplacedTask } from '@/lib/scheduler'

export interface UnplacedDrawerProps {
  isOpen: boolean
  onClose: () => void
  unplacedTasks: UnplacedTask[]
  onTaskUpdated?: () => void
}

export function UnplacedDrawer({
  isOpen,
  onClose,
  unplacedTasks,
  onTaskUpdated,
}: UnplacedDrawerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md transform bg-white shadow-2xl transition-all dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-base">⚖️</span>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Perlu Keputusan Manusia
              </h3>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                {unplacedTasks.length}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              ✕
            </button>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
            <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Tugas di bawah tidak muat pada slot waktu minggu ini atau melewati batas yang ditetapkan. Silakan pilih salah satu opsi aksi di bawah:
            </p>

            <UnplacedDecisionList
              unplaced={unplacedTasks}
              onTaskUpdated={onTaskUpdated}
            />
          </div>

          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            >
              Tutup Drawer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
