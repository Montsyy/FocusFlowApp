'use client'

import { useSyncExternalStore } from 'react'

interface OnboardingHintProps {
  userId: string
}

export function OnboardingHint({ userId }: OnboardingHintProps) {
  const isDismissed = useSyncExternalStore(
    (callback) => {
      window.addEventListener('storage', callback)
      return () => window.removeEventListener('storage', callback)
    },
    () => {
      try {
        return localStorage.getItem(`focusflow_onboarding_dismissed_${userId}`) === 'true'
      } catch {
        return false
      }
    },
    () => true
  )

  function handleDismiss() {
    try {
      localStorage.setItem(`focusflow_onboarding_dismissed_${userId}`, 'true')
      window.dispatchEvent(new Event('storage'))
    } catch {}
  }

  if (isDismissed) return null

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-blue-200/90 bg-gradient-to-r from-blue-50/95 via-sky-50/90 to-indigo-50/80 p-5 shadow-sm transition-all animate-in fade-in slide-in-from-top-2 duration-300 dark:border-blue-900/50 dark:from-blue-950/40 dark:via-sky-950/30 dark:to-indigo-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
            <span className="text-xl">🎯</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-tight text-blue-950 dark:text-blue-100">
                AI merekomendasikan, kamu yang memegang kendali!
              </h3>
              <span className="rounded-full bg-blue-100/80 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                Prinsip FocusFlow
              </span>
            </div>

            <p className="max-w-3xl text-xs leading-relaxed text-blue-900/80 dark:text-blue-200/80">
              FocusFlow menyusun jadwal fokus mingguan cerdas berdasarkan prioritas tugas, jam produktif, dan tingkat energimu. Namun rencana ini tidak kaku — kamu selalu memegang kendali penuh untuk mengunci blok penting, menggeser sesi di kalender, atau menunda tugas kapan saja.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-all"
          >
            <span>Paham, Saya Pegang Kendali</span>
            <span>✓</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Tutup petunjuk orientasi"
            className="rounded-lg p-1.5 text-blue-400 hover:bg-blue-100/60 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/40 dark:hover:text-blue-200 transition-colors"
          >
            <span className="text-sm leading-none">✕</span>
          </button>
        </div>
      </div>
    </div>
  )
}
