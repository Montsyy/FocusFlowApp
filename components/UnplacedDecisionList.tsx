'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useToast } from './Toast'
import { usePlanner } from './PlannerContext'
import type { UnplacedTask } from '@/lib/scheduler'
import type { Task } from '@/lib/types'

export interface UnplacedDecisionListProps {
  unplaced: UnplacedTask[]
  onTaskUpdated?: () => void
}

const REASON_LABELS: Record<string, string> = {
  'tidak muat': 'Slot Waktu Penuh',
  'melewati deadline': 'Melewati Deadline',
  'melebihi batas harian': 'Batas Harian (6j)',
}

export function UnplacedDecisionList({
  unplaced,
  onTaskUpdated,
}: UnplacedDecisionListProps) {
  const { showToast } = useToast()
  const { generateSchedule, isGenerating } = usePlanner()
  const [activeDelayMenuTaskId, setActiveDelayMenuTaskId] = useState<string | null>(null)
  const [helpModalTask, setHelpModalTask] = useState<Task | null>(null)
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)

  if (unplaced.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
        <p className="font-semibold">Semua tugas aktif berhasil dijadwalkan! 🎉</p>
        <p className="mt-0.5 text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
          Tidak ada tugas yang terlempar dari alokasi kalender minggu ini.
        </p>
      </div>
    )
  }

  async function handleSplitTask(task: Task) {
    setLoadingTaskId(task.id)
    try {
      const nextSessions = Math.max(2, (task.sesi_disarankan || 1) + 1)
      const supabase = createBrowserClient()
      const { error } = await supabase
        .from('tasks')
        .update({
          can_split: true,
          sesi_disarankan: nextSessions,
        })
        .eq('id', task.id)

      if (error) throw error

      showToast(
        `Tugas "${task.judul}" dipecah menjadi ${nextSessions} sesi ✂️`,
        'success'
      )
      await generateSchedule()
      onTaskUpdated?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memecah tugas'
      showToast(msg, 'error')
    } finally {
      setLoadingTaskId(null)
    }
  }

  async function handleDelayTask(task: Task, daysToAdd: number | 'tunda_status') {
    setLoadingTaskId(task.id)
    setActiveDelayMenuTaskId(null)

    try {
      const supabase = createBrowserClient()
      let updates: Partial<Task> = {}

      if (daysToAdd === 'tunda_status') {
        updates = { status: 'tunda' }
      } else {
        const baseDate = task.deadline ? new Date(task.deadline) : new Date()
        const newDeadline = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000)
        updates = { deadline: newDeadline.toISOString() }
      }

      const { error } = await supabase.from('tasks').update(updates).eq('id', task.id)
      if (error) throw error

      showToast(
        daysToAdd === 'tunda_status'
          ? `Tugas "${task.judul}" ditandai ditunda.`
          : `Tenggat tugas "${task.judul}" dimundurkan ${daysToAdd} hari 📅`,
        'success'
      )
      await generateSchedule()
      onTaskUpdated?.()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menunda tugas'
      showToast(msg, 'error')
    } finally {
      setLoadingTaskId(null)
    }
  }

  function handleCopyHelpTemplate(task: Task) {
    const text = `Halo, saya ingin mengabarkan terkait tugas "${task.judul}". Karena beban jadwal minggu ini melebihi kapasitas yang tersedia, apakah memungkinkan jika saya meminta perpanjangan tenggat waktu atau bantuan untuk membagi pengerjaannya? Terima kasih banyak!`
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showToast('Template pesan berhasil disalin ke clipboard! 📋', 'success')
      })
      .catch(() => {
        showToast('Gagal menyalin pesan, silakan salin manual.', 'error')
      })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        {unplaced.map((item) => {
          const task = item.task
          const reasonText = REASON_LABELS[item.reason] || item.reason
          const isLoading = isGenerating || loadingTaskId === task.id
          const isMenuOpen = activeDelayMenuTaskId === task.id

          return (
            <div
              key={task.id}
              className="rounded-xl border border-amber-200 bg-white p-3.5 shadow-sm transition-all dark:border-amber-900/40 dark:bg-zinc-900"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-100 dark:border-zinc-800">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">
                      {task.judul}
                    </span>
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 shrink-0">
                      {reasonText}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Durasi: {task.durasi_menit ?? 60}m • Kesulitan: {task.kesulitan ?? 3}/5 • Sesi: {task.sesi_disarankan || 1}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() =>
                      setActiveDelayMenuTaskId(isMenuOpen ? null : task.id)
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-all"
                  >
                    <span>📅</span>
                    <span>Tunda</span>
                    <span className="text-[10px] text-zinc-400">▾</span>
                  </button>

                  {isMenuOpen && (
                    <div className="absolute left-0 top-full mt-1 z-30 w-44 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-900 animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => void handleDelayTask(task, 3)}
                        className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        +3 Hari dari Deadline
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelayTask(task, 7)}
                        className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        +7 Hari (Minggu Depan)
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelayTask(task, 'tunda_status')}
                        className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                      >
                        Tandai Status Ditunda
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => void handleSplitTask(task)}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-900/50 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/80 transition-all"
                  title="Aktifkan pembagian tugas menjadi sesi-sesi lebih pendek"
                >
                  <span>✂️</span>
                  <span>Pecah tugas</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHelpModalTask(task)}
                  className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition-all"
                >
                  <span>💬</span>
                  <span>Minta bantuan</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {helpModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Template Permintaan Bantuan
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setHelpModalTask(null)}
                className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
              Gunakan draf pesan di bawah ini untuk berdiskusi dengan dosen, asisten, atau rekan tim mengenai tugas{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">
                &ldquo;{helpModalTask.judul}&rdquo;
              </strong>:
            </p>

            <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-xs text-zinc-800 leading-relaxed dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
              Halo, saya ingin mengabarkan terkait tugas &ldquo;{helpModalTask.judul}&rdquo;. Karena beban jadwal minggu ini melebihi kapasitas yang tersedia, apakah memungkinkan jika saya meminta perpanjangan tenggat waktu atau bantuan untuk membagi pengerjaannya? Terima kasih banyak!
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setHelpModalTask(null)}
                className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => handleCopyHelpTemplate(helpModalTask)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
              >
                <span>📋</span>
                <span>Salin Pesan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
