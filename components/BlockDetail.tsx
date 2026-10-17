'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useToast } from './Toast'
import { validateFixedEventOverlap } from '@/lib/scheduler/overlap'
import { getEnergyWindow } from '@/lib/scheduler/slots'
import type { ScheduleBlock, FixedEvent, Task } from '@/lib/types'

export interface SelectedEventData {
  type: 'fixed' | 'block'
  id: string
  title: string
  start: string
  end: string
  block?: ScheduleBlock
  fixedEvent?: FixedEvent
}

export interface BlockDetailProps {
  event: SelectedEventData | null
  onClose: () => void
  tasks?: Task[]
  fixedEvents?: FixedEvent[]
  allowEdit?: boolean
  onUpdateBlock?: (updated: ScheduleBlock) => void
  onDeleteBlock?: (deletedId: string, deletedBlock: ScheduleBlock) => void
  onToggleTaskStatus?: (task: Task) => void
}

export function BlockDetail({
  event,
  onClose,
  tasks = [],
  fixedEvents = [],
  allowEdit = true,
  onUpdateBlock,
  onDeleteBlock,
  onToggleTaskStatus,
}: BlockDetailProps) {
  const supabase = createBrowserClient()
  const { showToast } = useToast()

  const [isEditingTime, setIsEditingTime] = useState(false)
  const [editDate, setEditDate] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')

  const [isExplaining, setIsExplaining] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentAlasan, setCurrentAlasan] = useState<string | null>(null)

  if (!event) {
    return null
  }

  const isFixed = event.type === 'fixed'
  const block = event.block
  const task = block?.task_id ? tasks.find((t) => t.id === block.task_id) : undefined

  const displayedAlasan = currentAlasan ?? block?.alasan_ai ?? null

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

  function handleStartEditTime() {
    try {
      const s = new Date(event?.start || new Date())
      const e = new Date(event?.end || new Date())

      const yyyy = s.getFullYear()
      const mm = String(s.getMonth() + 1).padStart(2, '0')
      const dd = String(s.getDate()).padStart(2, '0')
      setEditDate(`${yyyy}-${mm}-${dd}`)

      setEditStart(
        s.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
      )
      setEditEnd(
        e.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
      )
      setIsEditingTime(true)
    } catch {
      setIsEditingTime(true)
    }
  }

  async function handleSaveEditedTime() {
    if (!block) return
    setIsSaving(true)

    try {
      const startDateTime = new Date(`${editDate}T${editStart}:00`)
      const endDateTime = new Date(`${editDate}T${editEnd}:00`)

      if (endDateTime.getTime() <= startDateTime.getTime()) {
        showToast('Jam selesai harus lebih akhir dari jam mulai', 'error')
        setIsSaving(false)
        return
      }

      const overlapCheck = validateFixedEventOverlap(
        startDateTime,
        endDateTime,
        fixedEvents
      )

      if (overlapCheck.hasOverlap) {
        showToast(
          `Bentrok dengan jadwal tetap "${overlapCheck.conflictingEvent?.judul}". Perubahan waktu dibatalkan.`,
          'error'
        )
        setIsSaving(false)
        return
      }

      const prevBlock = { ...block }
      const updated: ScheduleBlock = {
        ...block,
        mulai: startDateTime.toISOString(),
        selesai: endDateTime.toISOString(),
        dimodifikasi_manusia: true,
      }

      const { error } = await supabase
        .from('schedule_blocks')
        .update({
          mulai: updated.mulai,
          selesai: updated.selesai,
          dimodifikasi_manusia: true,
        })
        .eq('id', block.id)

      if (error) throw error

      onUpdateBlock?.(updated)
      setIsEditingTime(false)

      showToast('Waktu blok berhasil diubah 📅', 'success', {
        label: 'Urungkan',
        onClick: async () => {
          try {
            await supabase
              .from('schedule_blocks')
              .update({
                mulai: prevBlock.mulai,
                selesai: prevBlock.selesai,
                dimodifikasi_manusia: prevBlock.dimodifikasi_manusia,
              })
              .eq('id', prevBlock.id)
            onUpdateBlock?.(prevBlock)
            showToast('Perubahan waktu diurungkan ↩️', 'info')
          } catch {
            showToast('Gagal mengurungkan perubahan', 'error')
          }
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui waktu'
      showToast(msg, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleLock() {
    if (!block) return
    setIsSaving(true)
    const nextLocked = !block.dikunci

    try {
      const updated: ScheduleBlock = {
        ...block,
        dikunci: nextLocked,
        dimodifikasi_manusia: true,
      }

      const { error } = await supabase
        .from('schedule_blocks')
        .update({
          dikunci: nextLocked,
          dimodifikasi_manusia: true,
        })
        .eq('id', block.id)

      if (error) throw error

      onUpdateBlock?.(updated)
      showToast(
        nextLocked ? 'Blok jadwal dikunci 🔒' : 'Kunci blok jadwal dibuka 🔓',
        'success'
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah status kunci'
      showToast(msg, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleApprove() {
    if (!block) return
    setIsSaving(true)

    try {
      const updated: ScheduleBlock = {
        ...block,
        dimodifikasi_manusia: true,
      }

      const { error } = await supabase
        .from('schedule_blocks')
        .update({ dimodifikasi_manusia: true })
        .eq('id', block.id)

      if (error) throw error

      onUpdateBlock?.(updated)
      showToast('Jadwal blok disetujui! 👍', 'success')
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyetujui jadwal'
      showToast(msg, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteBlock() {
    if (!block) return
    setIsSaving(true)

    try {
      const prevBlock = { ...block }
      const { error } = await supabase
        .from('schedule_blocks')
        .delete()
        .eq('id', block.id)

      if (error) throw error

      onDeleteBlock?.(block.id, prevBlock)
      onClose()

      showToast('Blok jadwal berhasil dihapus 🗑️', 'success', {
        label: 'Urungkan',
        onClick: async () => {
          try {
            const { data, error: restoreError } = await supabase
              .from('schedule_blocks')
              .insert({
                user_id: prevBlock.user_id,
                task_id: prevBlock.task_id,
                mulai: prevBlock.mulai,
                selesai: prevBlock.selesai,
                dikunci: prevBlock.dikunci,
                dimodifikasi_manusia: prevBlock.dimodifikasi_manusia,
                alasan_ai: prevBlock.alasan_ai,
              })
              .select()
              .single()

            if (restoreError) throw restoreError
            if (data) {
              onUpdateBlock?.(data as ScheduleBlock)
            }
            showToast('Penghapusan blok jadwal diurungkan ↩️', 'info')
          } catch {
            showToast('Gagal mengurungkan penghapusan', 'error')
          }
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus blok'
      showToast(msg, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAskWhyHere() {
    if (!block || !event) return
    setIsExplaining(true)

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: event.title,
          scheduledTime: formatTimeRange(block.mulai, block.selesai),
          energyWindow: getEnergyWindow(new Date(block.mulai)),
          userEnergy: 4,
        }),
      })

      if (!res.ok) {
        throw new Error('Gagal memuat penjelasan AI')
      }

      const resJson = await res.json()
      const newReason = resJson.data?.reason || resJson.reason || 'Ditempatkan secara optimal.'

      setCurrentAlasan(newReason)

      const updated: ScheduleBlock = {
        ...block,
        alasan_ai: newReason,
      }

      await supabase
        .from('schedule_blocks')
        .update({ alasan_ai: newReason })
        .eq('id', block.id)

      onUpdateBlock?.(updated)
      showToast('Penjelasan AI diperbarui! 💡', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat penjelasan'
      showToast(msg, 'error')
    } finally {
      setIsExplaining(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${
                isFixed
                  ? 'bg-zinc-400'
                  : block?.dimodifikasi_manusia
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
              }`}
            />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {isFixed ? 'Detail Jadwal Tetap' : 'Detail Blok Jadwal'}
            </h3>
            {block?.dikunci && (
              <span className="text-sm" title="Blok Terkunci">
                🔒
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-all"
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
            {task && (
              <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>⏱️ {task.durasi_menit ?? 60} menit</span>
                <span>• Kesulitan: {task.kesulitan ?? 3}/5</span>
                <span>• Kepentingan: {task.kepentingan ?? 3}/5</span>
                {task.deadline && (
                  <span>
                    • Tenggat:{' '}
                    {new Date(task.deadline).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="block font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
                Waktu Pelaksanaan
              </span>
              {allowEdit && !isFixed && !isEditingTime && (
                <button
                  type="button"
                  onClick={handleStartEditTime}
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  ✏️ Ubah Waktu
                </button>
              )}
            </div>

            {!isEditingTime ? (
              <p className="mt-1 font-medium text-zinc-700 dark:text-zinc-300">
                {formatTimeRange(event.start, event.end)}
              </p>
            ) : (
              <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/40 dark:bg-blue-950/30">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 mb-1">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 mb-1">
                      Mulai
                    </label>
                    <input
                      type="time"
                      value={editStart}
                      onChange={(e) => setEditStart(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-zinc-500 mb-1">
                      Selesai
                    </label>
                    <input
                      type="time"
                      value={editEnd}
                      onChange={(e) => setEditEnd(e.target.value)}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingTime(false)}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void handleSaveEditedTime()}
                    className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Waktu'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <span className="block font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
              Status Blok
            </span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {isFixed ? (
                <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  📌 Jadwal Tetap Mingguan
                </span>
              ) : (
                <>
                  <span
                    className={`rounded-full px-2.5 py-1 font-semibold ${
                      block?.dimodifikasi_manusia
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
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

                  {task?.status === 'done' && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                      ✓ Selesai
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {!isFixed && (
            <div>
              <div className="flex items-center justify-between">
                <span className="block font-semibold uppercase tracking-wider text-zinc-400 text-[10px]">
                  Alasan Penjadwalan AI
                </span>
                <button
                  type="button"
                  disabled={isExplaining}
                  onClick={() => void handleAskWhyHere()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 disabled:opacity-50"
                >
                  <span>💡</span>
                  <span>{isExplaining ? 'Menganalisis...' : 'Kenapa di sini?'}</span>
                </button>
              </div>

              <p className="mt-1.5 rounded-xl bg-zinc-50 p-3 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300 leading-relaxed border border-zinc-100 dark:border-zinc-800">
                {displayedAlasan || 'Dijadwalkan otomatis berdasarkan kapasitas energi dan waktu luang.'}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-wrap items-center gap-2">
            {allowEdit && !isFixed && block && (
              <>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleToggleLock()}
                  className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 transition-all disabled:opacity-50"
                >
                  {block.dikunci ? '🔓 Buka kunci' : '🔒 Kunci'}
                </button>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleApprove()}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300 transition-all disabled:opacity-50"
                >
                  👍 Setuju
                </button>

                {task && onToggleTaskStatus && (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleTaskStatus(task)
                      onClose()
                    }}
                    className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300 transition-all"
                  >
                    {task.status === 'done' ? 'Batal Selesai' : '✓ Tandai selesai'}
                  </button>
                )}

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleDeleteBlock()}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300 transition-all disabled:opacity-50"
                >
                  🗑️ Hapus blok
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
