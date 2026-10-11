'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'info'
  text: string
}

interface ToastContextValue {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-md transition-all ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/80 dark:text-emerald-200'
                : toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/80 dark:text-red-200'
                : 'border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-200'
            }`}
          >
            <span>{toast.text}</span>
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
