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
  const cooldowns = getAllCooldowns().map((item) => {
    const parts = item.key.split(':')
    return {
      provider: parts[0] || 'unknown',
      model: parts[1] || 'unknown',
      remainingMs: item.remainingMs,
      until: item.until,
    }
  })

  let activeTarget = config.targets[0]
  for (const target of config.targets) {
    const isTargetCooling = cooldowns.some(
      (c) => c.provider === target.provider && c.model === target.model
    )
    if (!isTargetCooling) {
      activeTarget = target
      break
    }
  }

  return NextResponse.json({
    chain: config.targets,
    activeTarget,
    coolingDown: cooldowns,
    demoFallback: config.demoFallback,
  })
}
