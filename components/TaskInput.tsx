'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { taskFormSchema } from '@/lib/validations/tasks'
import { useToast } from './Toast'
import type { Task } from '@/lib/types'

interface TaskInputProps {
  initialData?: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (task: Task) => void
}

export function TaskInput({ initialData, isOpen, onClose, onSave }: TaskInputProps) {
  const supabase = createBrowserClient()
  const { showToast } = useToast()

  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const [judul, setJudul] = useState(initialData?.judul ?? '')
  const [deadline, setDeadline] = useState(
    initialData?.deadline ? initialData.deadline.substring(0, 16) : ''
  )
  const [durasiMenit, setDurasiMenit] = useState(initialData?.durasi_menit ?? 60)
  const [kesulitan, setKesulitan] = useState(initialData?.kesulitan ?? 3)
  const [kepentingan, setKepentingan] = useState(initialData?.kepentingan ?? 3)
  const [canSplit, setCanSplit] = useState(initialData?.can_split ?? false)
  const [sesiDisarankan, setSesiDisarankan] = useState(initialData?.sesi_disarankan ?? 1)
  const [status, setStatus] = useState<'todo' | 'in_progress' | 'done'>(
    (initialData?.status as 'todo' | 'in_progress' | 'done') || 'todo'
  )
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) {
    return null
  }

  async function handleAiParse() {
    if (!aiPrompt.trim()) return
    setAiLoading(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          currentDate: new Date().toISOString(),
        }),
      })

      if (!res.ok) {
        throw new Error('Gagal menganalisis tugas')
      }

      const json = await res.json()
      const data = json.data
      const meta = json.meta

      if (meta?.fallbackUsed) {
        showToast('Beralih ke model cadangan', 'info')
      } else {
        showToast('Tugas berhasil diuraikan oleh AI!', 'success')
      }

      if (data) {
        if (data.title) setJudul(data.title)
        if (data.deadline) {
          try {
            const d = new Date(data.deadline)
            const pad = (n: number) => String(n).padStart(2, '0')
            const localStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
            setDeadline(localStr)
          } catch {
            setDeadline(data.deadline.substring(0, 16))
          }
        }
        if (data.estimated_minutes) setDurasiMenit(data.estimated_minutes)
        if (data.difficulty) setKesulitan(data.difficulty)
        if (data.importance) setKepentingan(data.importance)
        if (typeof data.can_split === 'boolean') setCanSplit(data.can_split)
        if (data.suggested_sessions) setSesiDisarankan(data.suggested_sessions)
      }
    } catch {
      setJudul(aiPrompt)
      showToast('AI tidak dapat memproses, silakan lengkapi formulir manual', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    const parseResult = taskFormSchema.safeParse({
      judul,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      durasi_menit: durasiMenit,
      kesulitan,
      kepentingan,
      can_split: canSplit,
      sesi_disarankan: sesiDisarankan,
      status,
    })

    if (!parseResult.success) {
      setErrorMsg(parseResult.error.issues[0]?.message ?? 'Format data tidak valid')
      return
    }

    setLoading(true)
    try {
      if (initialData) {
        const { data, error } = await supabase
          .from('tasks')
          .update({
            judul: parseResult.data.judul,
            deadline: parseResult.data.deadline,
            durasi_menit: parseResult.data.durasi_menit,
            kesulitan: parseResult.data.kesulitan,
            kepentingan: parseResult.data.kepentingan,
            can_split: parseResult.data.can_split,
            sesi_disarankan: parseResult.data.sesi_disarankan,
            status: parseResult.data.status,
          })
          .eq('id', initialData.id)
          .select()
          .single()

        if (error) {
          throw error
        }

        showToast('Tugas berhasil diperbarui', 'success')
        onSave(data as Task)
        onClose()
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            judul: parseResult.data.judul,
            deadline: parseResult.data.deadline,
            durasi_menit: parseResult.data.durasi_menit,
            kesulitan: parseResult.data.kesulitan,
            kepentingan: parseResult.data.kepentingan,
            can_split: parseResult.data.can_split,
            sesi_disarankan: parseResult.data.sesi_disarankan,
            status: parseResult.data.status,
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        showToast('Tugas baru berhasil ditambahkan', 'success')
        onSave(data as Task)
        onClose()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan tugas'
      setErrorMsg(msg)
      showToast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {initialData ? 'Ubah Tugas' : 'Tambah Tugas Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {!initialData && (
          <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
            <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200">
              ✨ Analisis Cepat dengan AI
            </label>
            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              Ketik deskripsi tugas bebas (contoh: &quot;Laporan praktikum 2 jam deadline besok sore penting sulit&quot;)
            </p>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void handleAiParse()
                  }
                }}
                placeholder="Tulis deskripsi tugas..."
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                type="button"
                disabled={aiLoading || !aiPrompt.trim()}
                onClick={handleAiParse}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {aiLoading ? 'Menganalisis...' : 'Analisis AI'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Judul Tugas
            </label>
            <input
              type="text"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Laporan Akhir Praktikum Basis Data"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Batas Waktu (Deadline)
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Estimasi Durasi (Menit)
              </label>
              <input
                type="number"
                min={15}
                step={15}
                value={durasiMenit}
                onChange={(e) => setDurasiMenit(parseInt(e.target.value, 10) || 60)}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Tingkat Kesulitan (1 - 5)
              </label>
              <div className="mt-1.5 flex gap-2">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setKesulitan(lvl)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                      kesulitan === lvl
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Tingkat Kepentingan (1 - 5)
              </label>
              <div className="mt-1.5 flex gap-2">
                {[1, 2, 3, 4, 5].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setKepentingan(lvl)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                      kepentingan === lvl
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="flex items-center gap-3 pt-2">
              <input
                id="canSplit"
                type="checkbox"
                checked={canSplit}
                onChange={(e) => setCanSplit(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="canSplit" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Bisa dipecah jadi beberapa sesi
              </label>
            </div>

            {canSplit && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Target Sesi
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={sesiDisarankan}
                  onChange={(e) => setSesiDisarankan(parseInt(e.target.value, 10) || 1)}
                  className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-1.5 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Status Tugas
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'todo' | 'in_progress' | 'done')}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="todo">Belum Dimulai (Todo)</option>
              <option value="in_progress">Sedang Dikerjakan (In Progress)</option>
              <option value="done">Selesai</option>
            </select>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Menyimpan...' : initialData ? 'Perbarui Tugas' : 'Simpan Tugas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
