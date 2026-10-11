'use client'

import { useState } from 'react'

export function EnergyCheckin() {
  const [energy, setEnergy] = useState<'high' | 'medium' | 'low'>('high')

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Check-in Energi Hari Ini
        </h3>
        <span className="text-xs">⚡</span>
      </div>

      <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
        AI menyesuaikan kepadatan sesi belajar berdasarkan kapasitas energimu.
      </p>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setEnergy('high')}
          className={`rounded-xl py-2 px-1 text-center transition-all ${
            energy === 'high'
              ? 'bg-emerald-500 text-white font-bold shadow-sm'
              : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <span className="block text-sm">🔥</span>
          <span className="block text-[10px] mt-0.5">Prima</span>
        </button>

        <button
          type="button"
          onClick={() => setEnergy('medium')}
          className={`rounded-xl py-2 px-1 text-center transition-all ${
            energy === 'medium'
              ? 'bg-amber-500 text-white font-bold shadow-sm'
              : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <span className="block text-sm">⚡</span>
          <span className="block text-[10px] mt-0.5">Sedang</span>
        </button>

        <button
          type="button"
          onClick={() => setEnergy('low')}
          className={`rounded-xl py-2 px-1 text-center transition-all ${
            energy === 'low'
              ? 'bg-rose-500 text-white font-bold shadow-sm'
              : 'border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
          }`}
        >
          <span className="block text-sm">💤</span>
          <span className="block text-[10px] mt-0.5">Lelah</span>
        </button>
      </div>
    </div>
  )
}
