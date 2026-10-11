'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase/client'
import { loginSchema, registerSchema } from '@/lib/validations/auth'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createBrowserClient()

  const [mode, setMode] = useState<'masuk' | 'daftar'>('masuk')
  const [nama, setNama] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErrorMsg(null)
    setInfoMsg(null)

    if (mode === 'daftar') {
      const result = registerSchema.safeParse({ nama, email, password })
      if (!result.success) {
        setErrorMsg(result.error.issues[0]?.message ?? 'Data yang dimasukkan tidak valid')
        return
      }

      setLoading(true)
      try {
        const { data, error } = await supabase.auth.signUp({
          email: result.data.email,
          password: result.data.password,
          options: {
            data: {
              nama: result.data.nama,
            },
          },
        })

        if (error) {
          setErrorMsg(error.message)
          return
        }

        if (data.session) {
          router.push('/dashboard')
          router.refresh()
        } else {
          setInfoMsg(
            'Pendaftaran berhasil! Jika konfirmasi email aktif, silakan periksa kotak masuk email Anda.'
          )
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal melakukan pendaftaran'
        setErrorMsg(msg)
      } finally {
        setLoading(false)
      }
    } else {
      const result = loginSchema.safeParse({ email, password })
      if (!result.success) {
        setErrorMsg(result.error.issues[0]?.message ?? 'Data yang dimasukkan tidak valid')
        return
      }

      setLoading(true)
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: result.data.email,
          password: result.data.password,
        })

        if (error) {
          setErrorMsg('Email atau kata sandi salah. Silakan coba kembali.')
          return
        }

        router.push('/dashboard')
        router.refresh()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal masuk'
        setErrorMsg(msg)
      } finally {
        setLoading(false)
      }
    }
  }

  async function handleGoogleLogin() {
    setErrorMsg(null)
    setInfoMsg(null)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) {
        setErrorMsg(error.message)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal menghubungkan dengan Google'
      setErrorMsg(msg)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-zinc-50 via-white to-zinc-100 p-4 sm:p-6 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white/90 p-8 shadow-xl backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-900/90">
        <div className="text-center">
          <Link
            href="/"
            className="inline-block text-2xl font-extrabold tracking-tight text-zinc-900 transition-colors hover:text-indigo-600 dark:text-zinc-50 dark:hover:text-indigo-400"
          >
            FocusFlow
          </Link>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Work Smarter, Stay Human
          </p>
        </div>

        <div className="mt-6 flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            type="button"
            onClick={() => {
              setMode('masuk')
              setErrorMsg(null)
              setInfoMsg(null)
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
              mode === 'masuk'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('daftar')
              setErrorMsg(null)
              setInfoMsg(null)
            }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
              mode === 'daftar'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Daftar
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300">
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/50 dark:text-emerald-300">
            {infoMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          {mode === 'daftar' && (
            <div>
              <label
                htmlFor="nama"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
              >
                Nama Lengkap
              </label>
              <input
                id="nama"
                type="text"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Contoh: Budi Pratama"
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@kampus.ac.id"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
            >
              Kata Sandi
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading
              ? 'Memproses...'
              : mode === 'masuk'
              ? 'Masuk ke Akun'
              : 'Daftar Akun Baru'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
          </div>
          <span className="relative bg-white px-3 text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            atau
          </span>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/80"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Lanjut dengan Google
        </button>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          Dengan melanjutkan, Anda menyetujui prinsip AI sebagai Strategic Co-Pilot Anda.
        </p>
      </div>
    </main>
  )
}
