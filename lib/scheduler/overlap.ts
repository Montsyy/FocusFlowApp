import type { FixedEvent } from '@/lib/types'

export interface OverlapValidationResult {
  hasOverlap: boolean
  conflictingEvent?: FixedEvent
}

export function validateFixedEventOverlap(
  start: Date | string,
  end: Date | string,
  fixedEvents: FixedEvent[]
): OverlapValidationResult {
  const startDate = typeof start === 'string' ? new Date(start) : start
  const endDate = typeof end === 'string' ? new Date(end) : end

  const day = startDate.getDay()
  const blockStartMin = startDate.getHours() * 60 + startDate.getMinutes()
  const blockEndMin = endDate.getHours() * 60 + endDate.getMinutes()

  for (const fe of fixedEvents) {
    if (fe.hari === day) {
      const [startH, startM] = fe.jam_mulai.split(':').map((s) => parseInt(s, 10))
      const [endH, endM] = fe.jam_selesai.split(':').map((s) => parseInt(s, 10))
      const feStartMin = (startH || 0) * 60 + (startM || 0)
      const feEndMin = (endH || 0) * 60 + (endM || 0)

      if (Math.max(blockStartMin, feStartMin) < Math.min(blockEndMin, feEndMin)) {
        return {
          hasOverlap: true,
          conflictingEvent: fe,
        }
      }
    }
  }

  return { hasOverlap: false }
}
