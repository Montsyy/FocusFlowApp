import { z } from 'zod'
import type { AiProvider, AiTarget } from './types'

export interface AiConfig {
  targets: AiTarget[]
  geminiKeys: string[]
  nvidiaKeys: string[]
  nvidiaBaseUrl: string
  openaiKeys: string[]
  openaiBaseUrl: string
  attemptTimeoutMs: number
  totalBudgetMs: number
  cooldownRpmMs: number
  cooldownRpdMs: number
  demoFallback: boolean
}

const targetSchema = z.object({
  provider: z.enum(['gemini', 'nvidia', 'openai']),
  model: z.string().min(1),
})

export function parseChain(chainStr?: string): AiTarget[] {
  const raw = chainStr || 'gemini:gemini-2.5-flash,nvidia:meta/llama-3.3-70b-instruct'
  const entries = raw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)

  if (entries.length === 0) {
    throw new Error('AI_CHAIN cannot be empty')
  }

  return entries.map((entry) => {
    const [providerRaw, ...modelParts] = entry.split(':')
    const provider = providerRaw?.trim().toLowerCase() as AiProvider
    const model = modelParts.join(':').trim()

    const parsed = targetSchema.safeParse({ provider, model })
    if (!parsed.success) {
      throw new Error(`Invalid target in AI_CHAIN: "${entry}"`)
    }
    return parsed.data
  })
}

export function parseKeys(keysStr?: string): string[] {
  if (!keysStr) return []
  return keysStr
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
}

export function getAiConfig(envOverride?: Record<string, string | undefined>): AiConfig {
  const env = envOverride ?? process.env

  const targets = parseChain(env.AI_CHAIN)

  let geminiKeys = parseKeys(env.GEMINI_API_KEYS)
  if (geminiKeys.length === 0 && env.GEMINI_API_KEY) {
    geminiKeys = [env.GEMINI_API_KEY.trim()]
  }

  const nvidiaKeys = parseKeys(env.NVIDIA_API_KEYS)

  const nvidiaBaseUrl =
    env.NVIDIA_BASE_URL?.trim() || 'https://integrate.api.nvidia.com/v1'

  let openaiKeys = parseKeys(env.OPENAI_API_KEYS)
  if (openaiKeys.length === 0 && env.OPENAI_API_KEY) {
    openaiKeys = [env.OPENAI_API_KEY.trim()]
  }

  const openaiBaseUrl =
    env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1'

  const attemptTimeoutMs = env.AI_ATTEMPT_TIMEOUT_MS
    ? parseInt(env.AI_ATTEMPT_TIMEOUT_MS, 10)
    : 5000

  const totalBudgetMs = env.AI_TOTAL_BUDGET_MS
    ? parseInt(env.AI_TOTAL_BUDGET_MS, 10)
    : 15000

  const cooldownRpmMs = env.AI_COOLDOWN_RPM_MS
    ? parseInt(env.AI_COOLDOWN_RPM_MS, 10)
    : 60000

  const cooldownRpdMs = env.AI_COOLDOWN_RPD_MS
    ? parseInt(env.AI_COOLDOWN_RPD_MS, 10)
    : 86400000

  const demoFallback = env.DEMO_FALLBACK === 'true'

  return {
    targets,
    geminiKeys,
    nvidiaKeys,
    nvidiaBaseUrl,
    openaiKeys,
    openaiBaseUrl,
    attemptTimeoutMs: isNaN(attemptTimeoutMs) ? 5000 : attemptTimeoutMs,
    totalBudgetMs: isNaN(totalBudgetMs) ? 15000 : totalBudgetMs,
    cooldownRpmMs: isNaN(cooldownRpmMs) ? 60000 : cooldownRpmMs,
    cooldownRpdMs: isNaN(cooldownRpdMs) ? 86400000 : cooldownRpdMs,
    demoFallback,
  }
}
