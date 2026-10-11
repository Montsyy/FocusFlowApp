'use client'

import { useState } from 'react'
import type { Task } from '@/lib/types'

interface TaskPanelProps {
  tasks: Task[]
  loading: boolean
  onAddTask: () => void
  onEditTask: (task: Task) => void
  onDeleteTask: (id: string) => void
  onToggleStatus: (task: Task) => void
}

export function TaskPanel({
  tasks,
  loading,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleStatus,
}: TaskPanelProps) {
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'all') return true
    return t.status === filter
  })

  function formatDeadline(dateStr: string | null) {
    if (!dateStr) return null
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return null
    }
  }

  function getPriorityBadge(kepentingan = 3, kesulitan = 3) {
    const score = kepentingan * 2 + kesulitan
    if (score >= 12) {
      return (
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
          Prioritas Tinggi
        </span>
      )
    }
    if (score >= 8) {
      return (
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          Prioritas Sedang
        </span>
      )
    }
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
        Prioritas Rendah
      </span>
    )
  }

  return (
    <div className="flex flex-col h-full rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Daftar Tugas
            </h2>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {tasks.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onAddTask}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
          >
            <span>+</span>
            <span>Tambah</span>
          </button>
        </div>

        <div className="mt-3 flex gap-1 rounded-xl bg-zinc-100 p-1 text-xs dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`flex-1 rounded-lg py-1 font-semibold transition-all ${
              filter === 'all'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setFilter('todo')}
            className={`flex-1 rounded-lg py-1 font-semibold transition-all ${
              filter === 'todo'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Todo
          </button>
          <button
            type="button"
            onClick={() => setFilter('done')}
            className={`flex-1 rounded-lg py-1 font-semibold transition-all ${
              filter === 'done'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Selesai
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto min-h-[300px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-400">
            <p className="text-xs font-medium">Memuat tugas...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-500 dark:text-zinc-400">
            <p className="text-sm font-semibold">Belum ada tugas</p>
            <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500 max-w-xs">
              Mulai atur aktivitas mingguanmu dengan menambahkan tugas pertama.
            </p>
            <button
              type="button"
              onClick={onAddTask}
              className="mt-3 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
            >
              + Tambah Tugas
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTasks.map((task) => {
              const isDone = task.status === 'done'
              const deadlineText = formatDeadline(task.deadline)

              return (
                <div
                  key={task.id}
                  className={`group relative rounded-xl border p-3.5 transition-all ${
                    isDone
                      ? 'border-zinc-200/60 bg-zinc-50/50 opacity-75 dark:border-zinc-800/60 dark:bg-zinc-900/40'
                      : 'border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => onToggleStatus(task)}
                      className="mt-1 h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate ${
                            isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : ''
                          }`}
                        >
                          {task.judul}
                        </h3>
                        {getPriorityBadge(
                          task.kepentingan ?? 3,
                          task.kesulitan ?? 3
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                          ⏱ {task.durasi_menit ?? 60} mnt
                        </span>

                        {deadlineText && (
                          <span className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                            📅 {deadlineText}
                          </span>
                        )}

                        {task.can_split && (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                            ✂ {task.sesi_disarankan ?? 1} sesi
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onEditTask(task)}
                        title="Ubah tugas"
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        ✎
                      </button>

                      {deletingId === task.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteTask(task.id)
                              setDeletingId(null)
                            }}
                            className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-500"
                          >
                            Ya
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingId(task.id)}
                          title="Hapus tugas"
                          className="rounded-lg p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
