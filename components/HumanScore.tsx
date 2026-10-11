'use client'

export function HumanScore() {
  const score = 92

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Human Agency Score
        </h3>
        <span className="text-xs">🎯</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {score}%
          </span>
          <p className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
            Kendali Penuh di Tanganmu
          </p>
        </div>

        <div className="text-right text-[11px] text-zinc-500">
          <p>Otomatisasi AI: 50%</p>
          <p>Keputusan Manusia: 50%</p>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
        AI bertindak sebagai kopilot strategis, kamu yang menentukan prioritas akhir.
      </p>
    </div>
  )
}
