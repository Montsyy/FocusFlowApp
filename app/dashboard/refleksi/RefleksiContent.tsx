import { connection } from 'next/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function RefleksiContent() {
  await connection()
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 sm:p-8 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Refleksi Mingguan</h1>
          <Link
            href="/dashboard"
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Kembali ke Dashboard
          </Link>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Evaluasi eksekusi jadwal dan keseimbangan energi mingguan akan dikonfigurasi pada fase refleksi.
        </p>
      </div>
    </main>
  )
}
