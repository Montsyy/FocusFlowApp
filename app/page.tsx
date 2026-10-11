import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-zinc-50 via-white to-zinc-100 px-6 py-16 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 backdrop-blur-sm dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300">
          Work Smarter, Stay Human: AI as Your Strategic Co-Pilot
        </div>

        <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-50">
          FocusFlow
        </h1>

        <p className="mt-4 text-xl font-medium text-indigo-600 sm:text-2xl dark:text-indigo-400">
          AI menyusun rencana, kamu yang memegang kendali.
        </p>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-300">
          Asisten penjadwalan mingguan cerdas untuk mahasiswa. AI menganalisis tugas dan memperkirakan beban belajar, algoritma deterministik menyusun jadwal secara presisi, dan kamu tetap memegang kendali penuh atas waktu dan energimu.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-indigo-600 px-8 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/35 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto dark:focus:ring-offset-zinc-900"
          >
            Masuk
          </Link>
          <a
            href="#tentang"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-zinc-200 bg-white/80 px-8 text-base font-semibold text-zinc-700 shadow-sm transition-all hover:bg-zinc-100 hover:text-zinc-900 sm:w-auto dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          >
            Pelajari Lebih Lanjut
          </a>
        </div>

        <div id="tentang" className="mt-20 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Analisis Tugas AI
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Uraikan tugas kompleks ke estimasi waktu realistis menggunakan Google Gemini Flash.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Penjadwalan Terstruktur
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Algoritma deterministik menempatkan blok waktu tanpa halusinasi dan tanpa tumpang tindih.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200/80 bg-white/60 p-6 shadow-sm backdrop-blur-sm dark:border-zinc-800/80 dark:bg-zinc-900/60">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Kendali Manusia Mutlak
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Geser, sesuaikan, atau tolak saran AI kapan saja sesuai ketersediaan energimu.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
