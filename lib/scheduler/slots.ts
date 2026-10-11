import type { FixedEvent, ScheduleBlock } from '@/lib/types'

export interface EnergyLevels {
  pagi: number
  siang: number
  malam: number
}

export interface ActiveHours {
  start: string
  end: string
}

export interface TimeInterval {
  start: Date
  end: Date
}

export interface Slot {
  start: Date
  end: Date
  dayIndex: number
  window: 'pagi' | 'siang' | 'malam'
  energyScore: number
}

export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.split(':')
  const hours = parseInt(parts[0] || '0', 10)
  const minutes = parseInt(parts[1] || '0', 10)
  return hours * 60 + minutes
}

export function getEnergyWindow(date: Date): 'pagi' | 'siang' | 'malam' {
  const hours = date.getHours() + date.getMinutes() / 60
  if (hours >= 6 && hours < 12) {
    return 'pagi'
  }
  if (hours >= 12 && hours < 18) {
    return 'siang'
  }
  return 'malam'
}

export function getEnergyScore(
  date: Date,
  energy: Partial<EnergyLevels> = {}
): number {
  const window = getEnergyWindow(date)
  const defaultScore = 3
  if (window === 'pagi') return energy.pagi ?? defaultScore
  if (window === 'siang') return energy.siang ?? defaultScore
  return energy.malam ?? defaultScore
}

export function buildTimeGrid(
  weekStart: Date,
  activeHours: Partial<ActiveHours> = {},
  energy: Partial<EnergyLevels> = {}
): Slot[] {
  const startStr = activeHours.start ?? '07:00'
  const endStr = activeHours.end ?? '22:00'

  const startMinutes = parseTimeToMinutes(startStr)
  const endMinutes = parseTimeToMinutes(endStr)

  const baseDate = new Date(weekStart)
  baseDate.setHours(0, 0, 0, 0)

  const slots: Slot[] = []

  for (let day = 0; day < 7; day++) {
    const dayStart = new Date(baseDate.getTime() + day * 24 * 60 * 60 * 1000)

    for (let m = startMinutes; m + 30 <= endMinutes; m += 30) {
      const slotStart = new Date(dayStart.getTime() + m * 60 * 1000)
      const slotEnd = new Date(dayStart.getTime() + (m + 30) * 60 * 1000)
      const window = getEnergyWindow(slotStart)
      const energyScore = getEnergyScore(slotStart, energy)

      slots.push({
        start: slotStart,
        end: slotEnd,
        dayIndex: day,
        window,
        energyScore,
      })
    }
  }

  return slots
}

export function getFixedEventIntervals(
  fixedEvents: FixedEvent[],
  weekStart: Date
): TimeInterval[] {
  const baseDate = new Date(weekStart)
  baseDate.setHours(0, 0, 0, 0)

  const intervals: TimeInterval[] = []

  for (let day = 0; day < 7; day++) {
    const currentDate = new Date(baseDate.getTime() + day * 24 * 60 * 60 * 1000)
    const dayOfWeek = currentDate.getDay()

    for (const fe of fixedEvents) {
      if (fe.hari === dayOfWeek) {
        const startMin = parseTimeToMinutes(fe.jam_mulai)
        const endMin = parseTimeToMinutes(fe.jam_selesai)

        const start = new Date(currentDate.getTime() + startMin * 60 * 1000)
        const end = new Date(currentDate.getTime() + endMin * 60 * 1000)

        intervals.push({ start, end })
      }
    }
  }

  return intervals
}

export function getPreservedBlockIntervals(
  existingBlocks: ScheduleBlock[]
): TimeInterval[] {
  return existingBlocks
    .filter((b) => b.dikunci || b.dimodifikasi_manusia)
    .map((b) => ({
      start: new Date(b.mulai),
      end: new Date(b.selesai),
    }))
}

export function isIntervalOverlapping(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  return startA.getTime() < endB.getTime() && endA.getTime() > startB.getTime()
}

export function hasBufferViolation(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
  bufferMinutes = 10
): boolean {
  const bufferMs = bufferMinutes * 60 * 1000
  return (
    startA.getTime() < endB.getTime() + bufferMs &&
    endA.getTime() + bufferMs > startB.getTime()
  )
}
