import Link from 'next/link'

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Masuk ke FocusFlow
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          AI menyusun rencana, kamu yang memegang kendali.
        </p>
        <div className="mt-6 flex flex-col gap-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </main>
  )
}
