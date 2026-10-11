import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth'
import { getAiConfig, getAllCooldowns } from '@/lib/ai'

export const maxDuration = 10

export async function GET() {
  const { response } = await getAuthenticatedUser()
  if (response) {
    return response
  }

  const config = getAiConfig()
  const rawCooldowns = getAllCooldowns()
  const cooldownKeySet = new Set(rawCooldowns.map((c) => c.key))

  const allCandidates: Array<{
    target: (typeof config.targets)[0]
    keyIndex: number
    keyId: string
  }> = []

  for (const target of config.targets) {
    const keys =
      target.provider === 'gemini'
        ? config.geminiKeys
        : target.provider === 'nvidia'
        ? config.nvidiaKeys
        : config.openaiKeys
    for (let i = 0; i < keys.length; i++) {
      allCandidates.push({
        target,
        keyIndex: i,
        keyId: `${target.provider}:${target.model}:${i}`,
      })
    }
  }

  const hasKeys = allCandidates.length > 0

  const eligibleCandidates = allCandidates.filter(
    (c) => !cooldownKeySet.has(c.keyId)
  )

  const activeTarget =
    eligibleCandidates.length > 0 ? eligibleCandidates[0].target : undefined

  let connectionState: 'connected' | 'pending' | 'not_connected' = 'connected'
  if (!hasKeys || config.demoFallback) {
    connectionState = 'not_connected'
  } else if (eligibleCandidates.length > 0) {
    connectionState = 'connected'
  } else {
    connectionState = 'pending'
  }

  const cooldownMapByProvider = new Map<
    string,
    { provider: string; model: string; remainingMs: number; until: string }
  >()

  for (const item of rawCooldowns) {
    const parts = item.key.split(':')
    const provider = parts[0] || 'unknown'
    const model = parts[1] || 'unknown'
    const existing = cooldownMapByProvider.get(provider)
    if (!existing || item.remainingMs > existing.remainingMs) {
      cooldownMapByProvider.set(provider, {
        provider,
        model,
        remainingMs: item.remainingMs,
        until: item.until,
      })
    }
  }

  const coolingDown = Array.from(cooldownMapByProvider.values())

  return NextResponse.json({
    chain: config.targets,
    activeTarget,
    coolingDown,
    demoFallback: config.demoFallback,
    hasKeys,
    connectionState,
  })
}
