'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '@/components/Toast'
import { PlannerProvider, usePlanner } from '@/components/PlannerContext'
import { QuickActions } from '@/components/QuickActions'
import { TaskPanel } from '@/components/TaskPanel'
import { TaskInput } from '@/components/TaskInput'
import { FixedEventForm } from '@/components/FixedEventForm'
import { BlockDetail, type SelectedEventData } from '@/components/BlockDetail'
import { EnergyCheckin } from '@/components/EnergyCheckin'
import { RealityCheck } from '@/components/RealityCheck'
import { StatCards } from '@/components/StatCards'
import { AiStatusBadge } from '@/components/AiStatusBadge'
import { TodayAgenda } from '@/components/TodayAgenda'
import { ThemeToggle } from '@/components/ThemeToggle'
import { OnboardingHint } from '@/components/OnboardingHint'
import { schedule } from '@/lib/scheduler'
import type { Task, FixedEvent, ScheduleBlock } from '@/lib/types'

interface DashboardShellProps {
  userId?: string
  userNama: string
  userEmail: string
  initialMinggu?: string
}

function normalizeToSunday(dateStr?: string): string {
  if (!dateStr) {
    const today = new Date()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - today.getDay())
    const y = sunday.getFullYear()
    const m = String(sunday.getMonth() + 1).padStart(2, '0')
    const d = String(sunday.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const parts = dateStr.split('-').map(Number)
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    const d = new Date(parts[0], parts[1] - 1, parts[2])
    const day = d.getDay()
    const sunday = new Date(d)
    sunday.setDate(d.getDate() - day)
    const y = sunday.getFullYear()
    const m = String(sunday.getMonth() + 1).padStart(2, '0')
    const dt = String(sunday.getDate()).padStart(2, '0')
    return `${y}-${m}-${dt}`
  }

  const d = new Date(dateStr)
  const sunday = new Date(d)
  sunday.setDate(d.getDate() - d.getDay())
  const y = sunday.getFullYear()
  const m = String(sunday.getMonth() + 1).padStart(2, '0')
  const dt = String(sunday.getDate()).padStart(2, '0')
  return `${y}-${m}-${dt}`
}

function formatWeekRange(weekStartStr: string): string {
  const parts = weekStartStr.split('-').map(Number)
  const start =
    parts.length === 3 && parts[0] && parts[1] && parts[2]
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(weekStartStr)
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
  ]
  return `${start.getDate()} – ${end.getDate()} ${monthNames[end.getMonth()]} ${end.getFullYear()}`
}

function DashboardContentInner({ userId, userNama, userEmail, initialMinggu }: DashboardShellProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const { showToast } = useToast()
  const {
    scheduleBlocks,
    setScheduleBlocks,
    unplacedTasks,
    setUnplacedTasks,
    setCapacity,
    isGenerating,
    generateSchedule,
  } = usePlanner()

  const currentMinggu = normalizeToSunday(initialMinggu)

  const [mainView, setMainView] = useState<'dashboard' | 'fixed_events'>('dashboard')
  const [mobileTab, setMobileTab] = useState<'tasks' | 'agenda' | 'metrics'>('agenda')
  const [loggingOut, setLoggingOut] = useState(false)

  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)

  const [fixedEvents, setFixedEvents] = useState<FixedEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)

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

        if (!isMounted) return

        const freshTasks = (tData as Task[]) ?? []
        const freshEvents = (fData as FixedEvent[]) ?? []
        const freshBlocks = (bData as ScheduleBlock[]) ?? []

        setTasks(freshTasks)
        setFixedEvents(freshEvents)
        setScheduleBlocks(freshBlocks)

        const sched = schedule({
          tasks: freshTasks,
          fixedEvents: freshEvents,
          existingBlocks: freshBlocks,
          weekStart: currentMinggu,
        })
        setUnplacedTasks(sched.unplaced)
        setCapacity({
          totalRequiredMinutes: sched.totalRequiredMinutes,
          totalAvailableMinutes: sched.totalAvailableMinutes,
          percentage: Math.min(
            100,
            Math.round(
              (sched.totalRequiredMinutes /
                Math.max(1, sched.totalAvailableMinutes)) *
                100
            )
          ),
        })

        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search)
          const blokId = params.get('blok')
          if (blokId) {
            const found = freshBlocks.find((b) => b.id === blokId)
            if (found) {
              const task = freshTasks.find((t) => t.id === found.task_id)
              setSelectedEvent({
                type: 'block',
                id: found.id,
                title: task?.judul || found.alasan_ai || 'Blok Jadwal',
                start: found.mulai,
                end: found.selesai,
                block: found,
              })
            }
          }
        }
      } catch (err) {
        if (!isMounted) return
        const msg = err instanceof Error ? err.message : 'Gagal memuat data'
        showToast(msg, 'error')
      } finally {
        if (isMounted) {
          setLoadingTasks(false)
          setLoadingEvents(false)
        }
      }
    }

    void fetchData()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchData()
      }
    }

    const handleFocus = () => {
      void fetchData()
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const bId = params.get('blok')
      if (bId) {
        setScheduleBlocks((currentBlocks) => {
          const found = currentBlocks.find((b) => b.id === bId)
          if (found) {
            setTasks((currentTasks) => {
              const task = currentTasks.find((t) => t.id === found.task_id)
              setSelectedEvent({
                type: 'block',
                id: found.id,
                title: task?.judul || found.alasan_ai || 'Blok Jadwal',
                start: found.mulai,
                end: found.selesai,
                block: found,
              })
              return currentTasks
            })
          }
          return currentBlocks
        })
      } else {
        setSelectedEvent(null)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('popstate', handlePopState)

    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [supabase, currentMinggu, setScheduleBlocks, setUnplacedTasks, setCapacity, showToast])

  async function reloadTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      const freshTasks = (data as Task[]) ?? []
      setTasks(freshTasks)
      const sched = schedule({
        tasks: freshTasks,
        fixedEvents,
        existingBlocks: scheduleBlocks,
        weekStart: currentMinggu,
      })
      setUnplacedTasks(sched.unplaced)
      setCapacity({
        totalRequiredMinutes: sched.totalRequiredMinutes,
        totalAvailableMinutes: sched.totalAvailableMinutes,
        percentage: Math.min(
          100,
          Math.round(
            (sched.totalRequiredMinutes /
              Math.max(1, sched.totalAvailableMinutes)) *
              100
          )
        ),
      })
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
    await generateSchedule({
      weekStart: currentMinggu,
      showCalendarLink: true,
      currentMinggu,
      ...options,
    })
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
    const deletedTask = tasks.find((t) => t.id === taskId)
    const prevTasks = [...tasks]
    setTasks((current) => current.filter((t) => t.id !== taskId))

    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId)
      if (error) throw error

      if (deletedTask) {
        showToast('Tugas berhasil dihapus', 'success', {
          label: 'Urungkan',
          onClick: async () => {
            try {
              const { error: insErr } = await supabase.from('tasks').insert(deletedTask)
              if (insErr) throw insErr
              setTasks((prev) => [deletedTask, ...prev])
              showToast('Penghapusan dibatalkan', 'success')
              void handleAutoSchedule({ silent: true })
            } catch {
              showToast('Gagal memulihkan tugas', 'error')
            }
          },
        })
      } else {
        showToast('Tugas berhasil dihapus', 'success')
      }
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

  const thisWeekBlocks = scheduleBlocks.filter((b) => {
    const bDate = b.mulai.split('T')[0]
    const start = new Date(currentMinggu)
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    const bTime = new Date(bDate).getTime()
    return bTime >= start.getTime() && bTime < end.getTime()
  })

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400"
            >
              FocusFlow
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMainView('dashboard')}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  mainView === 'dashboard'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Dashboard
              </button>
              <button
                type="button"
                onClick={() => setMainView('fixed_events')}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  mainView === 'fixed_events'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                }`}
              >
                Jadwal Tetap ({fixedEvents.length})
              </button>
              <Link
                href={`/dashboard/kalender?minggu=${currentMinggu}`}
                className="rounded-lg px-3 py-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all"
              >
                Kalender Penuh
              </Link>
              <Link
                href="/dashboard/refleksi"
                className="rounded-lg px-3 py-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all"
              >
                Refleksi
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <AiStatusBadge />

            <button
              type="button"
              disabled={isGenerating}
              onClick={() => void handleAutoSchedule()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900"
            >
              {isGenerating ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Menyusun...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Susun Jadwal</span>
                </>
              )}
            </button>

            <ThemeToggle />

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
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all"
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
              className={`flex-1 rounded-lg py-1.5 text-center transition-all ${
                mobileTab === 'tasks'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Tugas ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('agenda')}
              className={`flex-1 rounded-lg py-1.5 text-center transition-all ${
                mobileTab === 'agenda'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Hari Ini & Kapasitas
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('metrics')}
              className={`flex-1 rounded-lg py-1.5 text-center transition-all ${
                mobileTab === 'metrics'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              Energi & Aksi
            </button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <OnboardingHint userId={userId || userEmail || 'user'} />

        {new Date().getDay() === 0 && (
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-indigo-50/60 p-4 sm:p-5 shadow-sm dark:border-blue-900/40 dark:from-blue-950/40 dark:via-sky-950/30 dark:to-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0">🌟</span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-blue-950 dark:text-blue-200">
                  Hari Minggu: Waktunya Refleksi Mingguan!
                </h3>
                <p className="mt-0.5 text-[11px] sm:text-xs text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
                  Evaluasi pencapaian belajarmu minggu ini, evaluasi ritme energi, dan siapkan fokus terbaik untuk minggu depan.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/refleksi"
              className="inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 whitespace-nowrap rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-all"
            >
              <span>Mulai Refleksi Mingguan</span>
              <span>→</span>
            </Link>
          </div>
        )}

        {mainView === 'dashboard' ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div
              className={`lg:col-span-4 ${
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
              className={`lg:col-span-5 flex flex-col gap-5 ${
                mobileTab === 'agenda' ? 'block' : 'hidden lg:block'
              }`}
            >
              <TodayAgenda
                scheduleBlocks={scheduleBlocks}
                tasks={tasks}
                currentMinggu={currentMinggu}
                onToggleTaskStatus={handleToggleTaskStatus}
              />

              <RealityCheck
                variant="full"
                totalEstimatedMinutes={totalEstimatedMinutes}
                unplacedTasks={unplacedTasks}
                onTaskUpdated={reloadTasks}
              />

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                      📅
                    </span>
                    <div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        Jadwal Kalender Mingguan
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {formatWeekRange(currentMinggu)} • {thisWeekBlocks.length} blok teralokasi
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/kalender?minggu=${currentMinggu}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-all"
                  >
                    <span>Buka Kalender Penuh</span>
                    <span>→</span>
                  </Link>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  Kalender penuh menampilkan tampilan waktu 24 jam interaktif, dukungan drag & drop, pengubahan durasi, penguncian jadwal, dan sinkronisasi otomatis.
                </p>

                {thisWeekBlocks.length > 0 ? (
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 dark:border-zinc-800/80 dark:bg-zinc-800/40 flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Cuplikan Blok Terjadwal Minggu Ini
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {thisWeekBlocks.slice(0, 4).map((b) => {
                        const task = tasks.find((t) => t.id === b.task_id)
                        const sTime = b.mulai.split('T')[1]?.substring(0, 5) || ''
                        const eTime = b.selesai.split('T')[1]?.substring(0, 5) || ''
                        return (
                          <div
                            key={b.id}
                            className="rounded-lg border border-zinc-200 bg-white p-2 text-xs shadow-2xs dark:border-zinc-700/60 dark:bg-zinc-800 flex items-center justify-between"
                          >
                            <span className="truncate max-w-[120px] font-medium text-zinc-800 dark:text-zinc-200">
                              {task?.judul || b.alasan_ai || 'Blok Fokus'}
                            </span>
                            <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                              {sTime}-{eTime}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-200 p-4 text-center dark:border-zinc-800">
                    <p className="text-xs text-zinc-400">
                      Belum ada blok jadwal di minggu ini. Klik &quot;Susun Jadwal&quot; di atas untuk menyusun otomatis dengan AI!
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div
              className={`lg:col-span-3 flex flex-col gap-6 ${
                mobileTab === 'metrics' ? 'block' : 'hidden lg:block'
              }`}
            >
              <QuickActions
                onAddTask={() => {
                  setEditingTask(null)
                  setTaskModalOpen(true)
                }}
                onManageFixedEvents={() => setMainView('fixed_events')}
                currentMinggu={currentMinggu}
              />
              <StatCards tasks={tasks} />
              <EnergyCheckin />

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Jadwal Tetap ({fixedEvents.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => setMainView('fixed_events')}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
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
        allowEdit={false}
        tasks={tasks}
        fixedEvents={fixedEvents}
        onToggleTaskStatus={handleToggleTaskStatus}
      />
    </div>
  )
}

export default function DashboardShell(props: DashboardShellProps) {
  return (
    <ToastProvider>
      <PlannerProvider>
        <DashboardContentInner {...props} />
      </PlannerProvider>
    </ToastProvider>
  )
}
