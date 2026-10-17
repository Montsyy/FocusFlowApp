import type { Task, ScheduleBlock, EnergyLog } from '@/lib/types'
import { getEnergyWindow } from '@/lib/scheduler/slots'

export interface WeeklyStatsInput {
  tasks: Task[]
  blocks: ScheduleBlock[]
  energyLogs?: EnergyLog[]
  weekStart: string
  now?: string
}

export interface WeeklyStats {
  totalTasks: number
  completedTasks: number
  missedTasks: number
  completionRate: number
  totalFocusMinutes: number
  totalFocusHours: number
  mostProductiveTimeWindow: 'pagi' | 'siang' | 'malam'
  energyAverage: number
}

export function computeWeeklyStats(input: WeeklyStatsInput): WeeklyStats {
  const weekStartDate = new Date(input.weekStart)
  weekStartDate.setHours(0, 0, 0, 0)
  const weekEndDate = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000)
  const nowDate = input.now ? new Date(input.now) : new Date()

  let completedTasks = 0
  let missedTasks = 0

  for (const task of input.tasks) {
    const isDone = task.status === 'done' || task.status === 'selesai'
    if (isDone) {
      completedTasks++
    } else if (task.deadline) {
      const deadlineDate = new Date(task.deadline)
      if (
        deadlineDate.getTime() <= weekEndDate.getTime() &&
        deadlineDate.getTime() <= nowDate.getTime()
      ) {
        missedTasks++
      }
    }
  }

  const totalTasks = input.tasks.length > 0 ? input.tasks.length : completedTasks + missedTasks
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  let totalFocusMinutes = 0
  const windowDurationMap: Record<'pagi' | 'siang' | 'malam', number> = {
    pagi: 0,
    siang: 0,
    malam: 0,
  }

  for (const block of input.blocks) {
    const bStart = new Date(block.mulai)
    const bEnd = new Date(block.selesai)

    if (
      bStart.getTime() >= weekStartDate.getTime() &&
      bStart.getTime() < weekEndDate.getTime()
    ) {
      const durationMin = Math.max(0, (bEnd.getTime() - bStart.getTime()) / 60000)
      totalFocusMinutes += durationMin

      const win = getEnergyWindow(bStart)
      windowDurationMap[win] += durationMin
    }
  }

  const totalFocusHours = Math.round((totalFocusMinutes / 60) * 10) / 10

  let mostProductiveTimeWindow: 'pagi' | 'siang' | 'malam' = 'pagi'
  let maxWindowDuration = -1

  for (const win of ['pagi', 'siang', 'malam'] as const) {
    if (windowDurationMap[win] > maxWindowDuration) {
      maxWindowDuration = windowDurationMap[win]
      mostProductiveTimeWindow = win
    }
  }

  let energyAverage = 3.0
  if (input.energyLogs && input.energyLogs.length > 0) {
    let totalScore = 0
    let count = 0
    for (const log of input.energyLogs) {
      const scores = [log.pagi, log.siang, log.malam].filter(
        (s): s is number => typeof s === 'number' && s > 0
      )
      for (const s of scores) {
        totalScore += s
        count++
      }
    }
    if (count > 0) {
      energyAverage = Math.round((totalScore / count) * 10) / 10
    }
  }

  return {
    totalTasks,
    completedTasks,
    missedTasks,
    completionRate,
    totalFocusMinutes,
    totalFocusHours,
    mostProductiveTimeWindow,
    energyAverage,
  }
}
