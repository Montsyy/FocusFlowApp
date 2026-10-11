export type Clock = () => number

const defaultClock: Clock = () => Date.now()

const cooldownMap = new Map<string, number>()

export function markCooldown(key: string, ms: number, clock: Clock = defaultClock): void {
  const until = clock() + Math.max(0, ms)
  cooldownMap.set(key, until)
}

export function isCoolingDown(key: string, clock: Clock = defaultClock): boolean {
  const until = cooldownMap.get(key)
  if (!until) return false
  if (clock() >= until) {
    cooldownMap.delete(key)
    return false
  }
  return true
}

export function getCooldownRemaining(key: string, clock: Clock = defaultClock): number {
  const until = cooldownMap.get(key)
  if (!until) return 0
  const remaining = until - clock()
  if (remaining <= 0) {
    cooldownMap.delete(key)
    return 0
  }
  return remaining
}

export function nextAvailable(
  keys: string[],
  clock: Clock = defaultClock
): { key: string; availableAt: number } | null {
  if (keys.length === 0) return null

  let earliestKey: string | null = null
  let earliestTime = Number.POSITIVE_INFINITY

  for (const key of keys) {
    const until = cooldownMap.get(key) ?? 0
    if (until <= clock()) {
      return { key, availableAt: clock() }
    }
    if (until < earliestTime) {
      earliestTime = until
      earliestKey = key
    }
  }

  if (earliestKey) {
    return { key: earliestKey, availableAt: earliestTime }
  }

  return null
}

export function getAllCooldowns(
  clock: Clock = defaultClock
): Array<{ key: string; remainingMs: number; until: string }> {
  const list: Array<{ key: string; remainingMs: number; until: string }> = []
  for (const [key, until] of cooldownMap.entries()) {
    if (clock() < until) {
      list.push({
        key,
        remainingMs: until - clock(),
        until: new Date(until).toISOString(),
      })
    } else {
      cooldownMap.delete(key)
    }
  }
  return list
}

export function resetCooldowns(): void {
  cooldownMap.clear()
}
