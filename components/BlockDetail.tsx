'use client'

import type { ScheduleBlock, FixedEvent } from '@/lib/types'

export interface SelectedEventData {
  type: 'fixed' | 'block'
  id: string
  title: string
  start: string
  end: string
  block?: ScheduleBlock
  fixedEvent?: FixedEvent
}

interface BlockDetailProps {
  event: SelectedEventData | null
  onClose: () => void
}

export function BlockDetail({ event, onClose }: BlockDetailProps) {
  if (!event) {
    return null
  }

  function formatTimeRange(startStr: string, endStr: string) {
    try {
      const s = new Date(startStr)
      const e = new Date(endStr)

      const dateText = s.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })

      const timeStart = s.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })

      const timeEnd = e.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })

      return `${dateText}, ${timeStart} - ${timeEnd}`
    } catch {
      return `${startStr} - ${endStr}`
    }
  }

  const isFixed = event.type === 'fixed'
  const block = event.block

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                isFixed
                  ? 'bg-zinc-400'
                  : block?.dimodifikasi_manusia
                  ? 'bg-emerald-500'
                  : 'bg-indigo-500'
              }`}
            />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Detail Blok Jadwal
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-4 text-xs">
          <div>
            <span className="block font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
              Aktivitas / Tugas
            </span>
            <p className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {event.title}
            </p>
          </div>

          <div>
            <span className="block font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
              Waktu Pelaksanaan
            </span>
            <p className="mt-1 font-medium text-zinc-700 dark:text-zinc-300">
              {formatTimeRange(event.start, event.end)}
            </p>
          </div>

          <div>
            <span className="block font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
              Status Blok
            </span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {isFixed ? (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  Jadwal Tetap Mingguan
                </span>
              ) : (
                <>
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold ${
                      block?.dimodifikasi_manusia
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                    }`}
                  >
                    {block?.dimodifikasi_manusia
                      ? 'Disesuaikan Manual'
                      : 'Rekomendasi AI'}
                  </span>

                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold ${
                      block?.dikunci
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                  >
                    {block?.dikunci ? '🔒 Terkunci' : '🔓 Fleksibel'}
                  </span>
                </>
              )}
            </div>
          </div>

          {block?.alasan_ai && (
            <div>
              <span className="block font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
                Alasan Penjadwalan AI
              </span>
              <p className="mt-1 rounded-xl bg-zinc-50 p-3 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300 leading-relaxed">
                {block.alasan_ai}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
