'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { ToastProvider, useToast } from '@/components/Toast'
import { AiStatusBadge } from '@/components/AiStatusBadge'
import { ThemeToggle } from '@/components/ThemeToggle'
import { computeWeeklyStats, type WeeklyStats } from '@/lib/stats/reflection'
import type { Reflection, Task, ScheduleBlock, EnergyLog } from '@/lib/types'

export interface RefleksiShellProps {
  userNama: string
  userEmail: string
  initialWeekStart: string
  initialStats: WeeklyStats
  initialReflection: Reflection | null
  initialHistory: Reflection[]
  initialTasks: Task[]
  initialBlocks: ScheduleBlock[]
  initialEnergyLogs: EnergyLog[]
}

function formatWeekRange(weekStartStr: string): string {
  const start = new Date(weekStartStr)
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des',
  ]

  const sDate = start.getDate()
  const eDate = end.getDate()
  const eMonth = monthNames[end.getMonth()]
  const year = end.getFullYear()

  return `${sDate} – ${eDate} ${eMonth} ${year}`
}

function RefleksiClientInner({
  userNama,
  userEmail,
  initialWeekStart,
  initialStats,
  initialReflection,
  initialHistory,
  initialTasks,
  initialBlocks,
  initialEnergyLogs,
}: RefleksiShellProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
  const { showToast } = useToast()

  const [currentWeek, setCurrentWeek] = useState(initialWeekStart)
  const [stats, setStats] = useState<WeeklyStats>(initialStats)
  const [summaryAi, setSummaryAi] = useState<string>(
    initialReflection?.ringkasan_ai ||
      `Minggu ini Anda telah menyelesaikan ${initialStats.completedTasks} dari ${initialStats.totalTasks} tugas (${initialStats.totalFocusHours} jam waktu fokus). Kerja bagus untuk menjaga kemajuan belajarmu!`
  )
  const [questionAi, setQuestionAi] = useState<string>(
    initialReflection?.pertanyaan ||
      'Bagaimana perasaanmu tentang keseimbangan antara waktu belajar dan istirahat pada minggu ini?'
  )
  const [userAnswer, setUserAnswer] = useState<string>(
    initialReflection?.jawaban_pengguna || ''
  )
  const [history, setHistory] = useState<Reflection[]>(initialHistory)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

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

  function handleSelectWeek(weekStr: string) {
    setCurrentWeek(weekStr)

    const computed = computeWeeklyStats({
      tasks: initialTasks,
      blocks: initialBlocks,
      energyLogs: initialEnergyLogs,
      weekStart: weekStr,
    })
    setStats(computed)

    const found = history.find((h) => h.minggu === weekStr)
    if (found) {
      setSummaryAi(found.ringkasan_ai || '')
      setQuestionAi(found.pertanyaan || '')
      setUserAnswer(found.jawaban_pengguna || '')
    } else {
      setSummaryAi(
        `Minggu ini Anda telah menyelesaikan ${computed.completedTasks} dari ${computed.totalTasks} tugas (${computed.totalFocusHours} jam waktu fokus).`
      )
      setQuestionAi(
        'Bagaimana ritme belajarmu minggu ini, dan apa satu hal yang ingin kamu tingkatkan untuk minggu depan?'
      )
      setUserAnswer('')
    }
  }

  async function handleGenerateAi() {
    setIsGeneratingAi(true)
    try {
      const res = await fetch('/api/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart: currentWeek,
          tasks: initialTasks,
          blocks: initialBlocks,
          energyLogs: initialEnergyLogs,
        }),
      })

      if (!res.ok) {
        throw new Error('Gagal menghasilkan analisis refleksi')
      }

      const json = await res.json()
      if (json.stats) {
        setStats(json.stats)
      }
      if (json.reflection) {
        setSummaryAi(json.reflection.summary || summaryAi)
        setQuestionAi(json.reflection.reflection_question || questionAi)
      }

      const msg = json.meta?.fallbackUsed
        ? 'Refleksi berhasil disusun dari statistik mingguanmu! 📋'
        : 'Analisis AI & pertanyaan refleksi berhasil dibuat! ✨'
      showToast(msg, 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghasilkan refleksi'
      showToast(msg, 'error')
    } finally {
      setIsGeneratingAi(false)
    }
  }

  async function handleSaveReflection() {
    if (!userAnswer.trim()) {
      showToast('Harap tuliskan refleksimu sebelum menyimpan.', 'info')
      return
    }

    setIsSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) throw new Error('Pengguna tidak terotentikasi')

      const { data: existing } = await supabase
        .from('reflections')
        .select('id')
        .eq('user_id', user.id)
        .eq('minggu', currentWeek)
        .maybeSingle()

      let savedRecord: Reflection

      if (existing?.id) {
        const { data: updated, error } = await supabase
          .from('reflections')
          .update({
            ringkasan_ai: summaryAi,
            pertanyaan: questionAi,
            jawaban_pengguna: userAnswer.trim(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        savedRecord = updated as Reflection
      } else {
        const { data: inserted, error } = await supabase
          .from('reflections')
          .insert({
            user_id: user.id,
            minggu: currentWeek,
            ringkasan_ai: summaryAi,
            pertanyaan: questionAi,
            jawaban_pengguna: userAnswer.trim(),
          })
          .select()
          .single()

        if (error) throw error
        savedRecord = inserted as Reflection
      }

      setHistory((prev) => {
        const filtered = prev.filter((h) => h.minggu !== currentWeek)
        return [savedRecord, ...filtered].sort(
          (a, b) => new Date(b.minggu).getTime() - new Date(a.minggu).getTime()
        )
      })

      showToast('Refleksi mingguan berhasil disimpan! 🎉', 'success')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan refleksi'
      showToast(msg, 'error')
    } finally {
      setIsSaving(false)
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
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all"
              >
                ← Dashboard
              </Link>
              <Link
                href="/dashboard/kalender"
                className="rounded-lg px-3 py-1.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-all"
              >
                Kalender Penuh
              </Link>
              <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                Refleksi Mingguan
              </span>
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

      <main className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Refleksi Mingguan
              </h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                {formatWeekRange(currentWeek)}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Evaluasi ketercapaian target, sebaran energi, dan pola produktivitas mingguanmu.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const prev = new Date(currentWeek)
                prev.setDate(prev.getDate() - 7)
                handleSelectWeek(prev.toISOString().split('T')[0]!)
              }}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition-all"
            >
              ← Minggu Lalu
            </button>
            <button
              type="button"
              onClick={() => handleSelectWeek(initialWeekStart)}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 transition-all"
            >
              Minggu Ini
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Penyelesaian
            </span>
            <div className="mt-2">
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {stats.completionRate}%
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {stats.completedTasks} dari {stats.totalTasks} tugas
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Total Jam Fokus
            </span>
            <div className="mt-2">
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {stats.totalFocusHours}j
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {stats.totalFocusMinutes} menit terjadwal
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Jendela Terbaik
            </span>
            <div className="mt-2">
              <p className="text-xl font-bold capitalize text-amber-600 dark:text-amber-400">
                {stats.mostProductiveTimeWindow}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                {stats.mostProductiveTimeWindow === 'pagi'
                  ? '06:00 - 12:00'
                  : stats.mostProductiveTimeWindow === 'siang'
                  ? '12:00 - 18:00'
                  : '18:00 - 23:00'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Rata-rata Energi
            </span>
            <div className="mt-2">
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400">
                {stats.energyAverage}
                <span className="text-sm font-normal text-zinc-400">/5</span>
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Log energi mingguan
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Tugas Meleset
            </span>
            <div className="mt-2">
              <p
                className={`text-2xl font-black ${
                  stats.missedTasks > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {stats.missedTasks}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                Perlu dijadwalkan ulang
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Ringkasan & Analisis AI
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Sintesis otomatis berdasarkan performa tugas dan jam fokus
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isGeneratingAi}
              onClick={handleGenerateAi}
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 transition-all"
            >
              <span>✨</span>
              <span>{isGeneratingAi ? 'Menganalisis...' : 'Segarkan Analisis AI'}</span>
            </button>
          </div>

          <div className="rounded-xl border border-blue-100/80 bg-blue-50/40 p-4 text-xs leading-relaxed text-blue-950 dark:border-blue-950/50 dark:bg-blue-950/20 dark:text-blue-200">
            {summaryAi}
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 text-xs dark:border-amber-900/40 dark:bg-amber-950/20">
            <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 mb-1">
              <span>💡</span>
              <span>Pertanyaan Refleksi Minggu Ini:</span>
            </div>
            <p className="text-amber-800 dark:text-amber-200/90 leading-relaxed">
              {questionAi}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">✍️</span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Refleksi Pribadi Anda
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Tuliskan jawaban pertanyaan refleksi atau catatan pribadimu minggu ini
                </p>
              </div>
            </div>
          </div>

          <textarea
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            rows={5}
            placeholder="Tuliskan refleksimu di sini... Bagaimana ritme belajarmu minggu ini, hambatan apa yang kamu hadapi, dan bagaimana rencanamu untuk minggu depan?"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 text-xs text-zinc-800 placeholder-zinc-400 focus:border-blue-500 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-100 dark:placeholder-zinc-500 transition-all"
          />

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
              {userAnswer.length} karakter
            </span>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveReflection}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50 transition-all"
            >
              <span>💾</span>
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Refleksi'}</span>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-lg">📚</span>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Riwayat Refleksi ({history.length})
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Daftar refleksi dari minggu-minggu sebelumnya
                </p>
              </div>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-6 text-center dark:border-zinc-800 dark:bg-zinc-800/40">
              <span className="text-3xl">🌱</span>
              <p className="mt-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Belum ada riwayat refleksi tersimpan
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Setiap akhir pekan, tulis dan simpan refleksi mingguanmu di sini untuk memantau perkembangan belajar jangka panjang!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:bg-zinc-800/50 flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      📅 {formatWeekRange(item.minggu)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectWeek(item.minggu)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Buka di Editor ↗
                    </button>
                  </div>

                  {item.ringkasan_ai && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed italic">
                      &ldquo;{item.ringkasan_ai}&rdquo;
                    </p>
                  )}

                  {item.jawaban_pengguna ? (
                    <div className="rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-800 dark:border-zinc-700/60 dark:bg-zinc-800 dark:text-zinc-200">
                      <span className="font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] uppercase block mb-1">
                        Catatan Pengguna:
                      </span>
                      {item.jawaban_pengguna}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-400 italic">
                      Belum ada catatan refleksi pengguna untuk minggu ini.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function RefleksiShell(props: RefleksiShellProps) {
  return (
    <ToastProvider>
      <RefleksiClientInner {...props} />
    </ToastProvider>
  )
}
