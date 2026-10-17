'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '@/components/Toast'
import { PlannerProvider, usePlanner } from '@/components/PlannerContext'
import { Calendar } from '@/components/Calendar'
import { BlockDetail, type SelectedEventData } from '@/components/BlockDetail'
import { RealityCheck } from '@/components/RealityCheck'
import { UnplacedDrawer } from '@/components/UnplacedDrawer'
import { AiStatusBadge } from '@/components/AiStatusBadge'
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
  const { scheduleBlocks, setScheduleBlocks, unplacedTasks, generateSchedule } = usePlanner()

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
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all"
              >
                ← Dashboard
              </Link>
              <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
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
              Lihat alokasi blok fokus otomatis yang diselaraskan dengan energi dan jadwal tetapmu. Geser atau ubah ukuran blok untuk mengatur ulang.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 transition-all"
          >
            <span>←</span>
            <span>Kembali ke Dashboard</span>
          </Link>
        </div>

        <RealityCheck
          variant="compact"
          onOpenUnplacedDrawer={() => setIsUnplacedDrawerOpen(true)}
        />

        <Calendar
          fixedEvents={initialFixedEvents}
          scheduleBlocks={scheduleBlocks}
          tasks={initialTasks}
          initialDate={initialMinggu}
          onSelectEvent={setSelectedEvent}
          editable={true}
          onBlockChange={handleBlockChange}
        />
      </main>

      <BlockDetail
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        tasks={initialTasks}
        fixedEvents={initialFixedEvents}
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
  return (
    <ToastProvider>
      <PlannerProvider initialBlocks={props.initialBlocks}>
        <KalenderClientInner {...props} />
      </PlannerProvider>
    </ToastProvider>
  )
}
