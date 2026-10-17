'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import Link from 'next/link'

export interface ToastAction {
  label: string
  href?: string
  onClick?: () => void
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  text: string
  action?: ToastAction
}

interface ToastContextValue {
  showToast: (
    text: string,
    type?: 'success' | 'error' | 'info',
    action?: ToastAction
  ) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback(
    (
      text: string,
      type: 'success' | 'error' | 'info' = 'info',
      action?: ToastAction
    ) => {
      const id = Math.random().toString(36).substring(2, 9)
      setToasts((prev) => [...prev, { id, text, type, action }])
      const timeout = action ? 7000 : 4000
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, timeout)
    },
    []
  )

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-md w-full px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-md transition-all ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/80 dark:text-emerald-200'
                : toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/80 dark:text-red-200'
                : 'border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-200'
            }`}
          >
            <span className="font-medium text-xs sm:text-sm">{toast.text}</span>

            <div className="flex items-center gap-2 shrink-0">
              {toast.action && (
                toast.action.href ? (
                  <Link
                    href={toast.action.href}
                    onClick={() => dismissToast(toast.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-all"
                  >
                    <span>{toast.action.label}</span>
                    <span>→</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      toast.action?.onClick?.()
                      dismissToast(toast.id)
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 transition-all"
                  >
                    <span>{toast.action.label}</span>
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                aria-label="Tutup notifikasi"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return {
      showToast: () => {},
    }
  }
  return context
}
