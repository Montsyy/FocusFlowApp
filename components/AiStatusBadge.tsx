'use client'

import { useEffect, useState } from 'react'

interface AiStatusData {
  chain: Array<{ provider: string; model: string }>
  activeTarget?: { provider: string; model: string }
  coolingDown: Array<{ provider: string; model: string; remainingMs: number }>
  demoFallback: boolean
  hasKeys?: boolean
  connectionState?: 'connected' | 'pending' | 'not_connected'
}

export function AiStatusBadge() {
  const [status, setStatus] = useState<AiStatusData | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function fetchStatus() {
      try {
        const res = await fetch('/api/ai-status')
        if (!res.ok) {
          if (isMounted) setFetchError(true)
          return
        }
        const data = (await res.json()) as AiStatusData
        if (isMounted) {
          setStatus(data)
          setFetchError(false)
        }
      } catch {
        if (isMounted) {
          setFetchError(true)
        }
      }
    }

    void fetchStatus()
    const timer = setInterval(() => void fetchStatus(), 30000)

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  let state: 'connected' | 'pending' | 'not_connected' = 'connected'
  if (fetchError) {
    state = 'not_connected'
  } else if (!status) {
    state = 'pending'
  } else if (status.connectionState) {
    state = status.connectionState
  } else if (status.demoFallback || status.hasKeys === false) {
    state = 'not_connected'
  } else if (status.activeTarget) {
    state = 'connected'
  } else if (status.coolingDown && status.coolingDown.length > 0) {
    state = 'pending'
  } else {
    state = 'connected'
  }

  const config = {
    connected: {
      label: 'Connected',
      dotClass: 'bg-emerald-500',
      badgeClass:
        'border-emerald-200/80 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/80 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
      description:
        status?.coolingDown && status.coolingDown.length > 0
          ? 'Layanan AI terhubung. Sistem otomatis beralih ke provider aktif karena terdapat provider/model lain yang sedang dalam masa jeda.'
          : 'Layanan AI terhubung dan siap memproses tugas dan penjadwalan secara optimal.',
    },
    pending: {
      label: 'Pending',
      dotClass: 'bg-amber-500 animate-pulse',
      badgeClass:
        'border-amber-200/80 bg-amber-50/70 text-amber-700 hover:bg-amber-100/80 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
      description:
        'Seluruh layanan AI sedang dalam masa jeda (cooldown) atau antrean. Sistem akan mencoba kembali saat masa jeda berakhir.',
    },
    not_connected: {
      label: 'Not Connected',
      dotClass: 'bg-rose-500',
      badgeClass:
        'border-rose-200/80 bg-rose-50/70 text-rose-700 hover:bg-rose-100/80 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
      description:
        'Layanan AI belum terhubung atau kunci API belum dikonfigurasi. Sistem menggunakan mode cadangan deterministik.',
    },
  }[state]

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${config.badgeClass}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
        <span>{config.label}</span>
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              AI Status
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold">
              <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
              <span
                className={
                  state === 'connected'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : state === 'pending'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {config.label}
              </span>
            </span>
          </div>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {config.description}
          </p>
          {status?.coolingDown && status.coolingDown.length > 0 && (
            <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <p className="text-[10px] font-semibold text-zinc-500">
                {state === 'connected'
                  ? 'Provider Lain Sedang Jeda (Otomatis Dialihkan):'
                  : 'Dalam Masa Tunggu Cooldown:'}
              </p>
              <ul className="mt-1 space-y-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                {status.coolingDown.map((c, i) => (
                  <li key={i}>
                    {c.provider} ({Math.ceil(c.remainingMs / 1000)} dtk)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
