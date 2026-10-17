'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '@/components/Toast'
import { PlannerProvider, usePlanner, type CapacityInfo } from '@/components/PlannerContext'
import { Calendar } from '@/components/Calendar'
import { BlockDetail, type SelectedEventData } from '@/components/BlockDetail'
import { RealityCheck } from '@/components/RealityCheck'
import { UnplacedDrawer } from '@/components/UnplacedDrawer'
import { AiStatusBadge } from '@/components/AiStatusBadge'
import { ScheduleLegend } from '@/components/ScheduleLegend'
import { ThemeToggle } from '@/components/ThemeToggle'
import { schedule } from '@/lib/scheduler'
import type { Task, FixedEvent, ScheduleBlock } from '@/lib/types'

interface KalenderShellProps {
  userNama: string
  userEmail: string
  initialMinggu?: string
  initialBlokId?: string
  initialTasks: Task[]
  initialFixedEvents: FixedEvent[]
  initialBlocks: ScheduleBlock[]
}

function KalenderClientInner({
  userNama,
  userEmail,
  initialMinggu,
  initialBlokId,
  initialTasks,
  initialFixedEvents,
  initialBlocks,
}: KalenderShellProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const { showToast } = useToast()
  const { scheduleBlocks, setScheduleBlocks, unplacedTasks, setUnplacedTasks, setCapacity, generateSchedule } = usePlanner()

  const [currentMinggu, setCurrentMinggu] = useState<string>(
    initialMinggu || new Date().toISOString().split('T')[0]
  )
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [fixedEvents, setFixedEvents] = useState<FixedEvent[]>(initialFixedEvents)

  const [isUnplacedDrawerOpen, setIsUnplacedDrawerOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<SelectedEventData | null>(() => {
    if (!initialBlokId) return null
    const found = initialBlocks.find((b) => b.id === initialBlokId)
    if (!found) return null
    const task = initialTasks.find((t) => t.id === found.task_id)
    const titleText = task?.judul || found.alasan_ai || 'Blok Jadwal'
    return {
      type: 'block',
      id: found.id,
      title: titleText,
      start: found.mulai,
      end: found.selesai,
      block: found,
    }
  })

  const syncData = useCallback(async () => {
    try {
      const [{ data: tData }, { data: fData }, { data: bData }] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('fixed_events').select('*'),
        supabase.from('schedule_blocks').select('*'),
      ])

      const freshTasks = (tData as Task[]) ?? tasks
      const freshFixed = (fData as FixedEvent[]) ?? fixedEvents
      const freshBlocks = (bData as ScheduleBlock[]) ?? scheduleBlocks

      setTasks(freshTasks)
      setFixedEvents(freshFixed)
      setScheduleBlocks(freshBlocks)

      const sched = schedule({
        tasks: freshTasks,
        fixedEvents: freshFixed,
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
    } catch {}
  }, [supabase, tasks, fixedEvents, scheduleBlocks, currentMinggu, setScheduleBlocks, setUnplacedTasks, setCapacity])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncData()
      }
    }

    const handleFocus = () => {
      void syncData()
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const bId = params.get('blok')
      if (bId) {
        const found = scheduleBlocks.find((b) => b.id === bId)
        if (found) {
          const task = tasks.find((t) => t.id === found.task_id)
          setSelectedEvent({
            type: 'block',
            id: found.id,
            title: task?.judul || found.alasan_ai || 'Blok Jadwal',
            start: found.mulai,
            end: found.selesai,
            block: found,
          })
        }
      } else {
        setSelectedEvent(null)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [syncData, scheduleBlocks, tasks])

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

  function handleBlockChange(updated: ScheduleBlock) {
    setScheduleBlocks((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b))
    )
  }

  function handleUpdateBlock(updated: ScheduleBlock) {
    setScheduleBlocks((prev) =>
      prev.map((b) => (b.id === updated.id ? updated : b))
    )
    setSelectedEvent((prev) =>
      prev
        ? {
            ...prev,
            start: updated.mulai,
            end: updated.selesai,
            block: updated,
          }
        : null
    )
  }

  function handleDeleteBlock(blockId: string) {
    setScheduleBlocks((prev) => prev.filter((b) => b.id !== blockId))
    setSelectedEvent(null)
  }

  async function handleToggleTaskStatus(task: Task) {
    const nextStatus = task.status === 'done' ? 'todo' : 'done'
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', task.id)
      if (error) throw error
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      )
      showToast(
        nextStatus === 'done'
          ? 'Tugas ditandai selesai! 🎉'
          : 'Tugas dikembalikan ke antrean todo',
        'success'
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status tugas'
      showToast(msg, 'error')
    }
  }

  function handleWeekChange(weekIso: string) {
    setCurrentMinggu(weekIso)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('minggu', weekIso)
      window.history.replaceState({}, '', url.toString())
    }
  }

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
              <Link
                href={`/dashboard?minggu=${currentMinggu}`}
                className="rounded-lg px-3 py-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all"
              >
                ← Dashboard
              </Link>
              <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Kalender Penuh
              </span>
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
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Jadwal Kalender Mingguan
            </h1>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Alokasi blok fokus otomatis yang diselaraskan dengan energi dan jadwal tetap. Geser atau ubah ukuran blok untuk menyesuaikan.
            </p>
          </div>

          <Link
            href={`/dashboard?minggu=${currentMinggu}`}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-all"
          >
            <span>←</span>
            <span>Kembali ke Dashboard</span>
          </Link>
        </div>

        <RealityCheck
          variant="compact"
          onOpenUnplacedDrawer={() => setIsUnplacedDrawerOpen(true)}
        />

        <ScheduleLegend />

        <Calendar
          fixedEvents={fixedEvents}
          scheduleBlocks={scheduleBlocks}
          tasks={tasks}
          initialDate={currentMinggu}
          onSelectEvent={setSelectedEvent}
          onWeekChange={handleWeekChange}
          editable={true}
          onBlockChange={handleBlockChange}
        />
      </main>

      <BlockDetail
        event={selectedEvent}
        onClose={() => {
          setSelectedEvent(null)
          if (typeof window !== 'undefined') {
            const url = new URL(window.location.href)
            if (url.searchParams.has('blok')) {
              url.searchParams.delete('blok')
              window.history.replaceState({}, '', url.toString())
            }
          }
        }}
        tasks={tasks}
        fixedEvents={fixedEvents}
        allowEdit={true}
        onUpdateBlock={handleUpdateBlock}
        onDeleteBlock={handleDeleteBlock}
        onToggleTaskStatus={handleToggleTaskStatus}
      />

      <UnplacedDrawer
        isOpen={isUnplacedDrawerOpen}
        onClose={() => setIsUnplacedDrawerOpen(false)}
        unplacedTasks={unplacedTasks}
        onTaskUpdated={() => void generateSchedule()}
      />
    </div>
  )
}

export default function KalenderShell(props: KalenderShellProps) {
  const initialSchedule = useMemo(() => {
    return schedule({
      tasks: props.initialTasks,
      fixedEvents: props.initialFixedEvents,
      existingBlocks: props.initialBlocks,
      weekStart: props.initialMinggu || new Date().toISOString().split('T')[0],
    })
  }, [props.initialTasks, props.initialFixedEvents, props.initialBlocks, props.initialMinggu])

  const initialCapacity: CapacityInfo = useMemo(() => {
    const req = initialSchedule.totalRequiredMinutes
    const avail = initialSchedule.totalAvailableMinutes
    return {
      totalRequiredMinutes: req,
      totalAvailableMinutes: avail,
      percentage: Math.min(100, Math.round((req / Math.max(1, avail)) * 100)),
    }
  }, [initialSchedule])

  return (
    <ToastProvider>
      <PlannerProvider
        initialBlocks={props.initialBlocks}
        initialUnplaced={initialSchedule.unplaced}
        initialCapacity={initialCapacity}
      >
        <KalenderClientInner {...props} />
      </PlannerProvider>
    </ToastProvider>
  )
}
