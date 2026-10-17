'use client'

import { useState } from 'react'

export function ScheduleLegend({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={`rounded-xl border border-zinc-200/80 bg-white/90 p-2.5 shadow-xs backdrop-blur-xs transition-all dark:border-zinc-800/80 dark:bg-zinc-900/90 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shadow-xs" />
            <span>Rencana AI</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-xs" />
            <span>Disetujui / Diedit</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs">🔒</span>
            <span>Terkunci</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-500 shadow-xs" />
            <span>📌 Jadwal Tetap</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="rounded bg-blue-100 px-1 py-0.2 text-[9px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              ✨ AI
            </span>
            <span>Memiliki Alasan AI</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Detail keterangan legenda"
          className="text-[10px] font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400 shrink-0"
        >
          {isOpen ? 'Ringkas' : 'Panduan'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-2.5 pt-2 border-t border-zinc-100 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 space-y-1 animate-in fade-in duration-200">
          <p>
            • <strong>Drag & Resize</strong>: Geser blok biru atau hijau untuk memindahkan jam belajar.
          </p>
          <p>
            • <strong>Kunci Blok (🔒)</strong>: Blok terkunci tidak akan tergeser ketika tombol &ldquo;Susun Jadwal&rdquo; ditekan kembali.
          </p>
          <p>
            • <strong>Indikator ✨ AI</strong>: Klik blok dengan tanda ini untuk membaca alasan penempatan dan tips energi di drawer detail.
          </p>
        </div>
      )}
    </div>
  )
}
