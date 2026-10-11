'use client'

import { useEffect, useState } from 'react'

interface AiStatusData {
  chain: Array<{ provider: string; model: string }>
  activeTarget?: { provider: string; model: string }
  coolingDown: Array<{ provider: string; model: string; remainingMs: number }>
  demoFallback: boolean
}

export function AiStatusBadge() {
  const [status, setStatus] = useState<AiStatusData | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function fetchStatus() {
      try {
        const res = await fetch('/api/ai-status')
        if (!res.ok) return
        const data = (await res.json()) as AiStatusData
        if (isMounted) {
          setStatus(data)
        }
      } catch {
      }
    }

    void fetchStatus()
    const timer = setInterval(() => void fetchStatus(), 30000)

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [])

  function formatModelLabel(target?: { provider: string; model: string }, demoFallback = false) {
    if (demoFallback) {
      return 'AI: Mode Cadangan'
    }
    if (!target) {
      return 'AI: Otomatis'
    }
    if (target.provider === 'gemini') {
      if (target.model.includes('3.5')) return 'AI: Gemini 3.5 Flash Lite'
      if (target.model.includes('3.1')) return 'AI: Gemini 3.1 Flash Lite'
      if (target.model.includes('2.5-flash-lite') || target.model.includes('flash-lite')) return 'AI: Gemini 2.5 Flash Lite'
      if (target.model.includes('2.5')) return 'AI: Gemini 2.5 Flash'
      if (target.model.includes('1.5')) return 'AI: Gemini 1.5 Flash'
      if (target.model.toLowerCase().includes('gemma')) return 'AI: Gemma 4 26B'
      return `AI: Gemini (${target.model})`
    }
    if (target.provider === 'nvidia') {
      if (target.model.includes('glm')) return 'AI: GLM 5.3 Flash'
      if (target.model.includes('deepseek')) return 'AI: DeepSeek v4.1 Flash'
      if (target.model.includes('glimmer') || target.model.includes('muse')) return 'AI: Muse Glimmer 30B'
      if (target.model.includes('llama-3.3')) return 'AI: NVIDIA Llama 3.3'
      if (target.model.includes('llama-3.1')) return 'AI: NVIDIA Llama 3.1'
      return `AI: NVIDIA (${target.model})`
    }
    if (target.provider === 'openai') {
      if (target.model.includes('5.4')) return 'AI: OpenAI GPT-5.4 Mini'
      if (target.model.includes('6-luna') || target.model.includes('luna')) return 'AI: OpenAI GPT-6 Luna'
      if (target.model.includes('4.1')) return 'AI: OpenAI GPT-4.1 Mini'
      if (target.model.includes('gpt-4o-mini')) return 'AI: OpenAI GPT-4o Mini'
      if (target.model.includes('gpt-4o')) return 'AI: OpenAI GPT-4o'
      if (target.model.includes('gpt-3.5')) return 'AI: OpenAI GPT-3.5'
      if (target.model.includes('o3-mini')) return 'AI: OpenAI o3-mini'
      if (target.model.includes('o1')) return 'AI: OpenAI o1'
      return `AI: OpenAI (${target.model})`
    }
    return `AI: ${target.model}`
  }

  const isFallback = status?.demoFallback ?? false
  const activeLabel = formatModelLabel(status?.activeTarget, isFallback)
  const hasCooling = (status?.coolingDown.length ?? 0) > 0

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip((prev) => !prev)}
        className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/80 bg-indigo-50/70 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100/80 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isFallback
              ? 'bg-amber-500 animate-pulse'
              : hasCooling
              ? 'bg-blue-400'
              : 'bg-emerald-500'
          }`}
        />
        <span>{activeLabel}</span>
      </button>

      {showTooltip && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-3 text-xs shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
            Multi-Provider AI Failover
          </p>
          <p className="mt-1 text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Sistem otomatis berpindah antar model Google Gemini, NVIDIA NIM, dan OpenAI saat kuota (RPM/RPD) habis atau provider mengalami gangguan.
          </p>
          {status?.coolingDown && status.coolingDown.length > 0 && (
            <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
              <p className="text-[10px] font-semibold text-zinc-500">
                Dalam Masa Tunggu Cooldown:
              </p>
              <ul className="mt-1 space-y-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                {status.coolingDown.map((c, i) => (
                  <li key={i}>
                    {c.provider}: {c.model} ({Math.ceil(c.remainingMs / 1000)} dtk)
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
