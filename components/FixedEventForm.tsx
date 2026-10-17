'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { fixedEventFormSchema } from '@/lib/validations/fixed-events'
import { parseIcsContent, type ParsedIcsEvent } from '@/lib/ics/parser'
import { useToast } from './Toast'
import type { FixedEvent } from '@/lib/types'

interface FixedEventFormProps {
  events: FixedEvent[]
  loading: boolean
  onSaveSuccess: () => void
}

const HARI_NAMES = [
  'Minggu',
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
]

export function FixedEventForm({
  events,
  loading,
  onSaveSuccess,
}: FixedEventFormProps) {
  const supabase = createBrowserClient()
  const { showToast } = useToast()

  const [editingEvent, setEditingEvent] = useState<FixedEvent | null>(null)
  const [judul, setJudul] = useState('')
  const [hari, setHari] = useState(1)
  const [jamMulai, setJamMulai] = useState('08:00')
  const [jamSelesai, setJamSelesai] = useState('10:00')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [showIcsModal, setShowIcsModal] = useState(false)
  const [icsPreviews, setIcsPreviews] = useState<ParsedIcsEvent[]>([])
  const [importingIcs, setImportingIcs] = useState(false)

  function startEdit(ev: FixedEvent) {
    setEditingEvent(ev)
    setJudul(ev.judul)
    setHari(ev.hari)
    setJamMulai(ev.jam_mulai.substring(0, 5))
    setJamSelesai(ev.jam_selesai.substring(0, 5))
    setErrorMsg(null)
  }

  function cancelEdit() {
    setEditingEvent(null)
    setJudul('')
    setHari(1)
    setJamMulai('08:00')
    setJamSelesai('10:00')
    setErrorMsg(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    const parseResult = fixedEventFormSchema.safeParse({
      judul,
      hari,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
    })

    if (!parseResult.success) {
      setErrorMsg(parseResult.error.issues[0]?.message ?? 'Data tidak valid')
      return
    }

    setSaving(true)
    try {
      if (editingEvent) {
        const { error } = await supabase
          .from('fixed_events')
          .update({
            judul: parseResult.data.judul,
            hari: parseResult.data.hari,
            jam_mulai: parseResult.data.jam_mulai,
            jam_selesai: parseResult.data.jam_selesai,
          })
          .eq('id', editingEvent.id)

        if (error) throw error
        showToast('Jadwal tetap berhasil diperbarui', 'success')
        cancelEdit()
        onSaveSuccess()
      } else {
        const { error } = await supabase.from('fixed_events').insert({
          judul: parseResult.data.judul,
          hari: parseResult.data.hari,
          jam_mulai: parseResult.data.jam_mulai,
          jam_selesai: parseResult.data.jam_selesai,
        })

        if (error) throw error
        showToast('Jadwal tetap baru berhasil ditambahkan', 'success')
        setJudul('')
        onSaveSuccess()
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan jadwal'
      setErrorMsg(msg)
      showToast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('fixed_events').delete().eq('id', id)
      if (error) throw error
      showToast('Jadwal tetap berhasil dihapus', 'success')
      if (editingEvent?.id === id) {
        cancelEdit()
      }
      onSaveSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus jadwal'
      showToast(msg, 'error')
    }
  }

  function handleIcsFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        const parsed = parseIcsContent(text)
        setIcsPreviews(parsed)
        setShowIcsModal(true)
      }
    }
    reader.readAsText(file)
  }

  async function handleConfirmImportIcs() {
    if (icsPreviews.length === 0) return

    setImportingIcs(true)
    try {
      const payload = icsPreviews.map((p) => ({
        judul: p.judul,
        hari: p.hari,
        jam_mulai: p.jam_mulai,
        jam_selesai: p.jam_selesai,
      }))

      const { error } = await supabase.from('fixed_events').insert(payload)
      if (error) throw error

      showToast(`Berhasil mengimpor ${icsPreviews.length} jadwal tetap!`, 'success')
      setShowIcsModal(false)
      setIcsPreviews([])
      onSaveSuccess()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal mengimpor jadwal .ics'
      showToast(msg, 'error')
    } finally {
      setImportingIcs(false)
    }
  }

  const sortedEvents = [...events].sort((a, b) => {
    if (a.hari !== b.hari) return a.hari - b.hari
    return a.jam_mulai.localeCompare(b.jam_mulai)
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              {editingEvent ? 'Ubah Jadwal Tetap' : 'Tambah Jadwal Tetap'}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Kuliah, les, atau aktivitas mingguan berulang.
            </p>
          </div>

          <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">
            <span>📅 Impor .ICS</span>
            <input
              type="file"
              accept=".ics"
              onChange={handleIcsFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Nama Aktivitas / Mata Kuliah
            </label>
            <input
              type="text"
              required
              value={judul}
              onChange={(e) => setJudul(e.target.value)}
              placeholder="Contoh: Kuliah Kecerdasan Buatan"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Hari
              </label>
              <select
                value={hari}
                onChange={(e) => setHari(parseInt(e.target.value, 10))}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value={1}>Senin</option>
                <option value={2}>Selasa</option>
                <option value={3}>Rabu</option>
                <option value={4}>Kamis</option>
                <option value={5}>Jumat</option>
                <option value={6}>Sabtu</option>
                <option value={0}>Minggu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Jam Mulai
              </label>
              <input
                type="time"
                required
                value={jamMulai}
                onChange={(e) => setJamMulai(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                Jam Selesai
              </label>
              <input
                type="time"
                required
                value={jamSelesai}
                onChange={(e) => setJamSelesai(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {editingEvent && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Batal Ubah
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
            >
              {saving
                ? 'Menyimpan...'
                : editingEvent
                ? 'Simpan Perubahan'
                : 'Tambah Jadwal'}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
          Daftar Jadwal Tetap Mingguan ({events.length})
        </h3>

        {loading ? (
          <p className="text-xs text-zinc-400 py-6 text-center">Memuat jadwal...</p>
        ) : sortedEvents.length === 0 ? (
          <div className="py-8 text-center flex flex-col items-center justify-center">
            <span className="text-3xl mb-2">📌</span>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Belum ada jadwal tetap terdaftar
            </p>
            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 max-w-xs">
              Tambahkan jadwal kuliah, praktikum, atau rutinitas wajib mingguan agar AI tidak menaruh sesi fokus di jam-jam tersebut.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40"
              >
                <div className="flex items-center gap-3">
                  <span className="w-16 font-bold text-blue-600 dark:text-blue-400">
                    {HARI_NAMES[ev.hari]}
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {ev.judul}
                    </p>
                    <p className="text-zinc-500 text-[11px]">
                      {ev.jam_mulai.substring(0, 5)} - {ev.jam_selesai.substring(0, 5)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(ev)}
                    className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                  >
                    ✎
                  </button>

                  {deletingId === ev.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          handleDelete(ev.id)
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
                      onClick={() => setDeletingId(ev.id)}
                      className="rounded p-1 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      🗑
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showIcsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Pratinjau Impor .ICS ({icsPreviews.length} Jadwal)
              </h3>
              <button
                type="button"
                onClick={() => setShowIcsModal(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2">
              {icsPreviews.map((p, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-zinc-100 bg-zinc-50 p-2.5 text-xs dark:border-zinc-800 dark:bg-zinc-800/50 flex justify-between"
                >
                  <span className="font-semibold">{p.judul}</span>
                  <span className="text-zinc-500">
                    {HARI_NAMES[p.hari]} ({p.jam_mulai} - {p.jam_selesai})
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowIcsModal(false)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={importingIcs}
                onClick={handleConfirmImportIcs}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50"
              >
                {importingIcs ? 'Menyimpan...' : 'Simpan Semua Jadwal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
