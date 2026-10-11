'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '@/components/Toast'
import { TaskPanel } from '@/components/TaskPanel'
import { TaskInput } from '@/components/TaskInput'
import { FixedEventForm } from '@/components/FixedEventForm'
import { Calendar } from '@/components/Calendar'
import { BlockDetail, type SelectedEventData } from '@/components/BlockDetail'
import { EnergyCheckin } from '@/components/EnergyCheckin'
import { RealityCheck } from '@/components/RealityCheck'
import { HumanScore } from '@/components/HumanScore'
import { AiStatusBadge } from '@/components/AiStatusBadge'
import type { Task, FixedEvent, ScheduleBlock } from '@/lib/types'

interface DashboardShellProps {
  userNama: string
  userEmail: string
}

function DashboardContentInner({ userNama, userEmail }: DashboardShellProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const { showToast } = useToast()

  const [mainView, setMainView] = useState<'dashboard' | 'fixed_events'>('dashboard')
  const [mobileTab, setMobileTab] = useState<'tasks' | 'calendar' | 'metrics'>('calendar')
  const [loggingOut, setLoggingOut] = useState(false)
  const [scheduling, setScheduling] = useState(false)

  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)

  const [fixedEvents, setFixedEvents] = useState<FixedEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([])

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventData | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        const [{ data: tData }, { data: fData }, { data: bData }] = await Promise.all([
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase.from('fixed_events').select('*'),
          supabase.from('schedule_blocks').select('*'),
        ])

        if (isMounted) {
          if (tData) setTasks(tData as Task[])
          if (fData) setFixedEvents(fData as FixedEvent[])
          if (bData) setScheduleBlocks(bData as ScheduleBlock[])
        }
      } catch (err) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Gagal memuat data'
          showToast(msg, 'error')
        }
      } finally {
        if (isMounted) {
          setLoadingTasks(false)
          setLoadingEvents(false)
        }
      }
    }

    void fetchData()

    return () => {
      isMounted = false
    }
  }, [supabase, showToast])

  async function reloadTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTasks((data as Task[]) ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat tugas'
      showToast(msg, 'error')
    }
  }

  async function reloadFixedEvents() {
    try {
      const { data, error } = await supabase.from('fixed_events').select('*')
      if (error) throw error
      setFixedEvents((data as FixedEvent[]) ?? [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat jadwal tetap'
      showToast(msg, 'error')
    }
  }

  async function handleSignOut() {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
      router.refresh()
    } catch {
      router.push('/login')
    } finally {
      setLoggingOut(false)
    }
  }

  async function handleAutoSchedule(options: { silent?: boolean; customSuccessMessage?: string } = {}) {
    setScheduling(true)
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        throw new Error('Gagal menyusun jadwal otomatis')
      }
      const data = await res.json()
      if (data.blocks) {
        setScheduleBlocks(data.blocks)
        const count = data.blocks.length
        const unplacedCount = data.unplaced?.length ?? 0
        if (!options.silent) {
          if (unplacedCount > 0) {
            showToast(
              `${count} blok terjadwal di kalender (${unplacedCount} tugas di luar batas jam belajar).`,
              'info'
            )
          } else if (options.customSuccessMessage) {
            showToast(options.customSuccessMessage, 'success')
          } else {
            showToast(`${count} blok tugas berhasil dijadwalkan ke kalender! 🎉`, 'success')
          }
        }
      }
    } catch (err) {
      if (!options.silent) {
        const msg = err instanceof Error ? err.message : 'Gagal menyusun jadwal'
        showToast(msg, 'error')
      }
    } finally {
      setScheduling(false)
    }
  }

  async function handleToggleTaskStatus(task: Task) {
    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    const prevTasks = [...tasks]

    setTasks((current) =>
      current.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    )

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', task.id)

      if (error) throw error
      showToast(
        nextStatus === 'done'
          ? 'Tugas ditandai selesai! 🎉'
          : 'Tugas dikembalikan ke antrean todo',
        'success'
      )
      void handleAutoSchedule({ silent: true })
    } catch (err) {
      setTasks(prevTasks)
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status tugas'
      showToast(msg, 'error')
    }
  }

  async function handleDeleteTask(taskId: string) {
    const prevTasks = [...tasks]
    setTasks((current) => current.filter((t) => t.id !== taskId))

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error
      showToast('Tugas berhasil dihapus', 'success')
      void handleAutoSchedule({ silent: true })
    } catch (err) {
      setTasks(prevTasks)
      const msg = err instanceof Error ? err.message : 'Gagal menghapus tugas'
      showToast(msg, 'error')
    }
  }

  async function handleSaveTask(savedTask: Task) {
    const isNew = !tasks.some((t) => t.id === savedTask.id)
    setTasks((current) => {
      const exists = current.some((t) => t.id === savedTask.id)
      if (exists) {
        return current.map((t) => (t.id === savedTask.id ? savedTask : t))
      }
      return [savedTask, ...current]
    })

    await handleAutoSchedule({
      silent: false,
      customSuccessMessage: isNew
        ? `Tugas "${savedTask.judul}" berhasil ditambahkan & langsung dijadwalkan di kalender! 📅`
        : `Tugas "${savedTask.judul}" diperbarui & jadwal kalender disinkronkan! 📅`,
    })
  }

  const totalEstimatedMinutes = tasks
    .filter((t) => t.status !== 'done')
    .reduce((acc, t) => acc + (t.durasi_menit ?? 60), 0)

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400"
            >
              FocusFlow
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMainView('dashboard')}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  mainView === 'dashboard'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Dashboard & Kalender
              </button>
              <button
                type="button"
                onClick={() => setMainView('fixed_events')}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  mainView === 'fixed_events'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Jadwal Tetap ({fixedEvents.length})
              </button>
              <Link
                href="/dashboard/refleksi"
                className="rounded-lg px-3 py-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Refleksi
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <AiStatusBadge />

            <button
              type="button"
              disabled={scheduling}
              onClick={() => void handleAutoSchedule()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 transition-all"
            >
              <span>✨</span>
              <span>{scheduling ? 'Menyusun...' : 'Susun Jadwal'}</span>
            </button>

            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Halo, {userNama}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[150px]">
                {userEmail}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loggingOut ? 'Keluar...' : 'Keluar'}
            </button>
          </div>
        </div>

        {mainView === 'dashboard' && (
          <div className="flex lg:hidden border-t border-zinc-200 px-4 py-2 gap-2 text-xs font-semibold dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setMobileTab('tasks')}
              className={`flex-1 rounded-lg py-1.5 text-center ${
                mobileTab === 'tasks'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'text-zinc-600'
              }`}
            >
              Tugas ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('calendar')}
              className={`flex-1 rounded-lg py-1.5 text-center ${
                mobileTab === 'calendar'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'text-zinc-600'
              }`}
            >
              Kalender
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('metrics')}
              className={`flex-1 rounded-lg py-1.5 text-center ${
                mobileTab === 'metrics'
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                  : 'text-zinc-600'
              }`}
            >
              Panel & Metrik
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {mainView === 'dashboard' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div
              className={`lg:col-span-3 ${
                mobileTab === 'tasks' ? 'block' : 'hidden lg:block'
              }`}
            >
              <TaskPanel
                tasks={tasks}
                loading={loadingTasks}
                onAddTask={() => {
                  setEditingTask(null)
                  setTaskModalOpen(true)
                }}
                onEditTask={(task) => {
                  setEditingTask(task)
                  setTaskModalOpen(true)
                }}
                onDeleteTask={handleDeleteTask}
                onToggleStatus={handleToggleTaskStatus}
              />
            </div>

            <div
              className={`lg:col-span-6 ${
                mobileTab === 'calendar' ? 'block' : 'hidden lg:block'
              }`}
            >
              <Calendar
                fixedEvents={fixedEvents}
                scheduleBlocks={scheduleBlocks}
                tasks={tasks}
                onSelectEvent={setSelectedEvent}
              />
            </div>

            <div
              className={`lg:col-span-3 flex flex-col gap-5 ${
                mobileTab === 'metrics' ? 'block' : 'hidden lg:block'
              }`}
            >
              <EnergyCheckin />
              <RealityCheck totalEstimatedMinutes={totalEstimatedMinutes} />
              <HumanScore />

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Jadwal Tetap ({fixedEvents.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setMainView('fixed_events')}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Kelola
                  </button>
                </div>
                {fixedEvents.length === 0 ? (
                  <p className="mt-2 text-[11px] text-zinc-400">
                    Belum ada jadwal tetap.
                  </p>
                ) : (
                  <div className="mt-2 flex flex-col gap-1.5">
                    {fixedEvents.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400"
                      >
                        <span className="truncate max-w-[140px] font-medium">{ev.judul}</span>
                        <span className="text-[10px] text-zinc-400">
                          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][ev.hari]}{' '}
                          {ev.jam_mulai.substring(0, 5)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <FixedEventForm
            events={fixedEvents}
            loading={loadingEvents}
            onSaveSuccess={reloadFixedEvents}
          />
        )}
      </main>

      <TaskInput
        key={editingTask?.id ?? (taskModalOpen ? 'open' : 'closed')}
        isOpen={taskModalOpen}
        initialData={editingTask}
        onClose={() => setTaskModalOpen(false)}
        onSave={async (task) => {
          await handleSaveTask(task)
          void reloadTasks()
        }}
      />

      <BlockDetail
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  )
}

export default function DashboardShell(props: DashboardShellProps) {
  return (
    <ToastProvider>
      <DashboardContentInner {...props} />
    </ToastProvider>
  )
}
