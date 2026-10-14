'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useToast } from './Toast'
import type { EnergyLog } from '@/lib/types'

interface EnergyCheckinProps {
  onSaved?: (log: EnergyLog) => void
}

const MOOD_OPTIONS = [
  { id: 'fokus', label: 'Fokus', emoji: '🎯' },
  { id: 'semangat', label: 'Semangat', emoji: '🔥' },
  { id: 'tenang', label: 'Tenang', emoji: '🌿' },
  { id: 'produktif', label: 'Produktif', emoji: '⚡' },
  { id: 'lelah', label: 'Lelah', emoji: '🥱' },
  { id: 'kewalahan', label: 'Kewalahan', emoji: '🤯' },
]

const ENERGY_LEVEL_LABELS: Record<number, string> = {
  1: 'Sangat Rendah',
  2: 'Rendah',
  3: 'Cukup',
  4: 'Tinggi',
  5: 'Maksimal',
}

export function EnergyCheckin({ onSaved }: EnergyCheckinProps) {
  const supabase = createBrowserClient()
  const { showToast } = useToast()

  const [pagi, setPagi] = useState(3)
  const [siang, setSiang] = useState(3)
  const [malam, setMalam] = useState(3)
  const [mood, setMood] = useState<string>('fokus')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)

  const isInitialMount = useRef(true)

  const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0]
  }

  useEffect(() => {
    let isMounted = true

    async function loadTodayEnergy() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const todayStr = getTodayDateString()
        const { data, error } = await supabase
          .from('energy_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('tanggal', todayStr)
          .maybeSingle()

        if (error) throw error

        if (isMounted && data) {
          const log = data as EnergyLog
          if (log.pagi != null) setPagi(log.pagi)
          if (log.siang != null) setSiang(log.siang)
          if (log.malam != null) setMalam(log.malam)
          if (log.mood) setMood(log.mood)
          setHasSaved(true)
        }
      } catch {
        // Silently keep default values
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    void loadTodayEnergy()

    return () => {
      isMounted = false
    }
  }, [supabase])

  const saveEnergy = useCallback(
    async (
      override?: { pagi?: number; siang?: number; malam?: number; mood?: string },
      options?: { notify?: boolean }
    ) => {
      setSaving(true)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) throw new Error('Pengguna belum masuk')

        const todayStr = getTodayDateString()
        const targetPagi = override?.pagi ?? pagi
        const targetSiang = override?.siang ?? siang
        const targetMalam = override?.malam ?? malam
        const targetMood = override?.mood ?? mood

        const payload = {
          user_id: user.id,
          tanggal: todayStr,
          pagi: targetPagi,
          siang: targetSiang,
          malam: targetMalam,
          mood: targetMood,
        }

        const { data, error } = await supabase
          .from('energy_logs')
          .upsert(payload, { onConflict: 'user_id,tanggal' })
          .select()
          .single()

        if (error) throw error

        setHasSaved(true)
        if (options?.notify) {
          showToast('Check-in energi hari ini tersimpan! ⚡', 'success')
        }
        if (data && onSaved) {
          onSaved(data as EnergyLog)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal menyimpan energi'
        showToast(msg, 'error')
      } finally {
        setSaving(false)
      }
    },
    [supabase, pagi, siang, malam, mood, showToast, onSaved]
  )

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (loading) return

    const timer = setTimeout(() => {
      void saveEnergy(undefined, { notify: false })
    }, 1200)

    return () => clearTimeout(timer)
  }, [pagi, siang, malam, mood, loading, saveEnergy])

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <span className="text-sm">⚡</span>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            Check-in Energi Hari Ini
          </h3>
        </div>
        {hasSaved && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span>✓</span>
            <span>Tersimpan</span>
          </span>
        )}
      </div>

      <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
        Bantu AI menyesuaikan intensitas jadwal belajarmu dengan kapasitas energimu hari ini.
      </p>

      <div className="mt-4 flex flex-col gap-4">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
              <span>🌅</span>
              <span>Pagi (06:00 - 12:00)</span>
            </span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {pagi}/5 • {ENERGY_LEVEL_LABELS[pagi]}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={pagi}
            disabled={loading}
            onChange={(e) => setPagi(Number(e.target.value))}
            className="mt-2 w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 dark:bg-zinc-700"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 px-0.5 mt-0.5">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
              <span>☀️</span>
              <span>Siang (12:00 - 18:00)</span>
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              {siang}/5 • {ENERGY_LEVEL_LABELS[siang]}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={siang}
            disabled={loading}
            onChange={(e) => setSiang(Number(e.target.value))}
            className="mt-2 w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-amber-500 dark:bg-zinc-700"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 px-0.5 mt-0.5">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
              <span>🌙</span>
              <span>Malam (18:00 - 23:00)</span>
            </span>
            <span className="text-blue-600 dark:text-blue-400">
              {malam}/5 • {ENERGY_LEVEL_LABELS[malam]}
            </span>
          </div>
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={malam}
            disabled={loading}
            onChange={(e) => setMalam(Number(e.target.value))}
            className="mt-2 w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:bg-zinc-700"
          />
          <div className="flex justify-between text-[10px] text-zinc-400 px-0.5 mt-0.5">
            <span>1</span>
            <span>2</span>
            <span>3</span>
            <span>4</span>
            <span>5</span>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-100 pt-3.5 dark:border-zinc-800">
        <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Kondisi Mood Hari Ini
        </label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MOOD_OPTIONS.map((item) => {
            const isSelected = mood === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setMood(item.id)}
                className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 dark:ring-indigo-700 font-semibold'
                    : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700/60'
                }`}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-4 pt-3 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
        <span className="text-[11px] text-zinc-400">
          {saving ? 'Menyimpan...' : hasSaved ? 'Tersinkronisasi otomatis' : 'Siap disimpan'}
        </span>
        <button
          type="button"
          disabled={saving || loading}
          onClick={() => void saveEnergy(undefined, { notify: true })}
          className="rounded-xl bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-all"
        >
          {saving ? 'Menyimpan...' : 'Simpan Sekarang'}
        </button>
      </div>
    </div>
  )
}
