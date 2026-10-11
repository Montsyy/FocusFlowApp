'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'

interface DashboardShellProps {
  userNama: string
  userEmail: string
}

export default function DashboardShell({ userNama, userEmail }: DashboardShellProps) {
  const router = useRouter()
  const supabase = createBrowserClient()
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              FocusFlow
            </Link>
            <span className="hidden text-xs font-medium text-zinc-500 sm:inline-block dark:text-zinc-400">
              AI Strategic Co-Pilot
            </span>
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

            <Link
              href="/dashboard/refleksi"
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Refleksi
            </Link>

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
      </header>

      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 dark:border-indigo-950 dark:bg-indigo-950/20">
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            Selamat datang di FocusFlow, {userNama}!
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            AI siap menganalisis tugas dan menyusun rencana mingguan yang seimbang.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Jadwal Kalender Mingguan
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Integrasi FullCalendar siap dikonfigurasi pada tahap berikutnya.
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Panel Tugas
              </h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Kelola daftar tugas dan estimasi AI di sini.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Status Energi
              </h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Sesuaikan jadwal dengan ritme produktivitas harianmu.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
