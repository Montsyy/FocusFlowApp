'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePlanner } from './PlannerContext'
import type { ScheduleBlock, Task } from '@/lib/types'

export interface TodayAgendaProps {
  scheduleBlocks: ScheduleBlock[]
  tasks: Task[]
  currentMinggu: string
  onToggleTaskStatus?: (task: Task) => void
}

export function TodayAgenda({
  scheduleBlocks,
  tasks,
  currentMinggu,
  onToggleTaskStatus,
}: TodayAgendaProps) {
  const { replanToday, isGenerating } = usePlanner()
  const todayStr = useMemo(() => new Date().toDateString(), [])

  const todayBlocks = useMemo(() => {
    return scheduleBlocks
      .filter((b) => new Date(b.mulai).toDateString() === todayStr)
      .sort((a, b) => new Date(a.mulai).getTime() - new Date(b.mulai).getTime())
  }, [scheduleBlocks, todayStr])

  const taskMap = useMemo(() => {
    const map = new Map<string, Task>()
    tasks.forEach((t) => map.set(t.id, t))
    return map
  }, [tasks])

  const completedCount = useMemo(() => {
    return todayBlocks.filter((b) => {
      const task = b.task_id ? taskMap.get(b.task_id) : undefined
      return task?.status === 'done' || task?.status === 'selesai'
    }).length
  }, [todayBlocks, taskMap])

  const todayDateFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    }).format(new Date())
  }, [])

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Agenda Hari Ini
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 capitalize">
              {todayDateFormatted}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {todayBlocks.length > 0 && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
              {completedCount}/{todayBlocks.length} Selesai
            </span>
          )}

          <button
            type="button"
            disabled={isGenerating}
            onClick={() => void replanToday()}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300 transition-all"
            title="Susun ulang sisa slot hari ini mulai dari jam sekarang"
          >
            <span>🚨</span>
            <span className="hidden sm:inline">Hari Ini Kacau</span>
          </button>
        </div>
      </div>

      {todayBlocks.length === 0 ? (
        <div className="py-8 text-center flex flex-col items-center justify-center">
          <span className="text-3xl mb-2">☕</span>
          <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Belum ada blok fokus terjadwal untuk hari ini.
          </p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs">
            Hari ini bebas dari beban belajar. Nikmati waktu istirahat atau susun jadwal baru untuk mengisi slot waktu luang.
          </p>
          <Link
            href={`/dashboard/kalender?minggu=${currentMinggu}`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 transition-all"
          >
            <span>Buka kalender penuh</span>
            <span>→</span>
          </Link>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {todayBlocks.map((block) => {
            const task = block.task_id ? taskMap.get(block.task_id) : undefined
            const isDone = task?.status === 'done' || task?.status === 'selesai'
            const title = task?.judul || block.alasan_ai || 'Blok Jadwal'

            const startObj = new Date(block.mulai)
            const endObj = new Date(block.selesai)
            const timeString = `${startObj.getHours().toString().padStart(2, '0')}:${startObj.getMinutes().toString().padStart(2, '0')} - ${endObj.getHours().toString().padStart(2, '0')}:${endObj.getMinutes().toString().padStart(2, '0')}`

            return (
              <div
                key={block.id}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                  isDone
                    ? 'border-zinc-100 bg-zinc-50/70 opacity-70 dark:border-zinc-800/60 dark:bg-zinc-800/40'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-800/80 dark:hover:border-zinc-700'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {block.dikunci && (
                      <span title="Blok Terkunci" className="text-xs">
                        🔒
                      </span>
                    )}
                    <p
                      className={`text-xs font-semibold truncate ${
                        isDone
                          ? 'line-through text-zinc-500 dark:text-zinc-400'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {title}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span>⏰ {timeString}</span>
                    {block.dimodifikasi_manusia && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        • Diubah manual
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task && onToggleTaskStatus && (
                    <button
                      type="button"
                      onClick={() => onToggleTaskStatus(task)}
                      className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                        isDone
                          ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-300'
                      }`}
                      title={isDone ? 'Batalkan selesai' : 'Tandai selesai'}
                    >
                      <span>{isDone ? '↩️' : '✓'}</span>
                      <span className="hidden sm:inline">
                        {isDone ? 'Batal' : 'Selesai'}
                      </span>
                    </button>
                  )}

                  <Link
                    href={`/dashboard/kalender?minggu=${currentMinggu}&blok=${block.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-all"
                    title="Buka blok di kalender penuh"
                  >
                    <span>Lihat</span>
                    <span>↗</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
