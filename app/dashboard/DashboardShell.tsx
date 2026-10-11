'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '@/components/Toast'
import { TaskPanel } from '@/components/TaskPanel'
import { TaskInput } from '@/components/TaskInput'
import { FixedEventForm } from '@/components/FixedEventForm'
import type { Task, FixedEvent } from '@/lib/types'

interface DashboardShellProps {
  userNama: string
  userEmail: string
}

function DashboardContentInner({ userNama, userEmail }: DashboardShellProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState<'planner' | 'fixed_events'>('planner')
  const [loggingOut, setLoggingOut] = useState(false)

  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)

  const [fixedEvents, setFixedEvents] = useState<FixedEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        const [{ data: tData }, { data: fData }] = await Promise.all([
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase.from('fixed_events').select('*'),
        ])

        if (isMounted) {
          if (tData) setTasks(tData as Task[])
          if (fData) setFixedEvents(fData as FixedEvent[])
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
    } catch (err) {
      setTasks(prevTasks)
      const msg = err instanceof Error ? err.message : 'Gagal menghapus tugas'
      showToast(msg, 'error')
    }
  }

  function handleSaveTask(savedTask: Task) {
    setTasks((current) => {
      const exists = current.some((t) => t.id === savedTask.id)
      if (exists) {
        return current.map((t) => (t.id === savedTask.id ? savedTask : t))
      }
      return [savedTask, ...current]
    })
  }

  const pendingTasksCount = tasks.filter((t) => t.status !== 'done').length
  const completedTasksCount = tasks.filter((t) => t.status === 'done').length

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
                onClick={() => setActiveTab('planner')}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  activeTab === 'planner'
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Tugas & Planner
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('fixed_events')}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  activeTab === 'fixed_events'
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

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Halo, {userNama}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
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

        <div className="flex md:hidden border-t border-zinc-200 px-4 py-2 gap-2 text-xs font-semibold dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className={`flex-1 rounded-lg py-1.5 text-center ${
              activeTab === 'planner'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'text-zinc-600'
            }`}
          >
            Tugas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fixed_events')}
            className={`flex-1 rounded-lg py-1.5 text-center ${
              activeTab === 'fixed_events'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                : 'text-zinc-600'
            }`}
          >
            Jadwal Tetap
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 dark:border-indigo-950 dark:bg-indigo-950/20">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
              Selamat datang, {userNama}!
            </h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Kelola tugas dan komitmen mingguanmu untuk penjadwalan cerdas.
            </p>
          </div>

          <div className="flex gap-3 text-xs font-semibold">
            <div className="rounded-xl bg-white px-4 py-2.5 shadow-sm dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-zinc-400 block text-[10px] uppercase">Antrean Tugas</span>
              <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                {pendingTasksCount}
              </span>
            </div>
            <div className="rounded-xl bg-white px-4 py-2.5 shadow-sm dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-zinc-400 block text-[10px] uppercase">Selesai</span>
              <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                {completedTasksCount}
              </span>
            </div>
            <div className="rounded-xl bg-white px-4 py-2.5 shadow-sm dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <span className="text-zinc-400 block text-[10px] uppercase">Jadwal Tetap</span>
              <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                {fixedEvents.length}
              </span>
            </div>
          </div>
        </div>

        {activeTab === 'planner' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
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

            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Kalender Mingguan
                  </h2>
                  <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                    Persiapan Penjadwalan AI
                  </span>
                </div>
                <div className="mt-6 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-zinc-200 rounded-xl dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    Kalender Siap Diintegrasikan
                  </p>
                  <p className="mt-1 text-xs text-zinc-500 max-w-sm">
                    Tugas ({tasks.length}) dan jadwal tetap ({fixedEvents.length}) yang Anda masukkan akan ditempatkan secara otomatis oleh mesin penjadwalan.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTask(null)
                      setTaskModalOpen(true)
                    }}
                    className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
                  >
                    + Tambah Tugas Lagi
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  Pratinjau Komitmen Tetap ({fixedEvents.length})
                </h3>
                {fixedEvents.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    Belum ada jadwal tetap. Klik tab &quot;Jadwal Tetap&quot; untuk menambahkan kuliah atau aktivitas berulang.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    {fixedEvents.slice(0, 4).map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl border border-zinc-100 bg-zinc-50 p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-800/40"
                      >
                        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{ev.judul}</p>
                        <p className="text-[11px] text-zinc-500">
                          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][ev.hari]} • {ev.jam_mulai.substring(0, 5)} - {ev.jam_selesai.substring(0, 5)}
                        </p>
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
        onSave={(task) => {
          handleSaveTask(task)
          void reloadTasks()
        }}
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
