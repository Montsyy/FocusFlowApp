import type { FixedEvent, ScheduleBlock, Task } from '@/lib/types'
import { calculatePriority } from './priority'
import {
  type ActiveHours,
  type EnergyLevels,
  type Slot,
  type TimeInterval,
  buildTimeGrid,
  getFixedEventIntervals,
  hasBufferViolation,
  isIntervalOverlapping,
  parseTimeToMinutes,
} from './slots'

export interface SchedulerInput {
  tasks: Task[]
  fixedEvents: FixedEvent[]
  existingBlocks?: ScheduleBlock[]
  energy?: Partial<EnergyLevels>
  weekStart: Date | string
  activeHours?: Partial<ActiveHours>
  now?: Date | string
  replanTodayOnly?: boolean
}

export interface UnplacedTask {
  task: Task
  reason: 'tidak muat' | 'melewati deadline' | 'melebihi batas harian'
}

export interface SchedulerOutput {
  blocks: ScheduleBlock[]
  unplaced: UnplacedTask[]
  totalRequiredMinutes: number
  totalAvailableMinutes: number
}

export function splitTask(task: Task): number[] {
  const total = task.durasi_menit ?? 60
  if (!task.can_split) {
    return [total]
  }

  const maxSession = 90
  if (total <= maxSession) {
    if (task.sesi_disarankan > 1 && Math.floor(total / task.sesi_disarankan) >= 30) {
      const count = task.sesi_disarankan
      const base = Math.floor(total / count / 30) * 30
      const result: number[] = []
      let rem = total
      for (let i = 0; i < count - 1; i++) {
        const s = base > 0 ? base : 30
        result.push(s)
        rem -= s
      }
      result.push(rem)
      return result
    }
    return [total]
  }

  const count = Math.max(task.sesi_disarankan || 1, Math.ceil(total / maxSession))
  const sessions: number[] = []
  let rem = total

  while (rem > 0) {
    const remainingSessions = count - sessions.length
    if (remainingSessions <= 1) {
      sessions.push(rem)
      break
    }
    const ideal = Math.min(maxSession, Math.ceil(rem / remainingSessions / 30) * 30)
    const chunk = Math.min(ideal, rem - (remainingSessions - 1) * 30)
    sessions.push(chunk)
    rem -= chunk
  }

  return sessions
}

function determineUnplacedReason(
  task: Task,
  sessionDuration: number,
  now: Date,
  staticBlockedIntervals: TimeInterval[],
  grid: Slot[],
  dailyMinutes: number[]
): 'tidak muat' | 'melewati deadline' | 'melebihi batas harian' {
  if (task.deadline) {
    const deadlineTime = new Date(task.deadline).getTime()
    if (deadlineTime <= now.getTime()) {
      return 'melewati deadline'
    }
  }

  if (sessionDuration > 360) {
    return 'melebihi batas harian'
  }

  const allDaysCapped = dailyMinutes.every((m) => m + sessionDuration > 360)
  if (allDaysCapped) {
    return 'melebihi batas harian'
  }

  if (task.deadline) {
    const deadlineTime = new Date(task.deadline).getTime()
    const slotsBeforeDeadline = grid.filter((s) => s.end.getTime() <= deadlineTime)
    if (slotsBeforeDeadline.length === 0) {
      return 'melewati deadline'
    }
    const hasUnblockedBeforeDeadline = slotsBeforeDeadline.some(
      (s) =>
        !staticBlockedIntervals.some((b) =>
          isIntervalOverlapping(s.start, s.end, b.start, b.end)
        )
    )
    if (!hasUnblockedBeforeDeadline) {
      return 'melewati deadline'
    }
  }

  return 'tidak muat'
}

export function schedule(input: SchedulerInput): SchedulerOutput {
  const weekStartDate = new Date(input.weekStart)
  weekStartDate.setHours(0, 0, 0, 0)

  const nowDate = input.now ? new Date(input.now) : new Date(weekStartDate)
  const activeHours: ActiveHours = {
    start: input.activeHours?.start ?? '07:00',
    end: input.activeHours?.end ?? '22:00',
  }
  const energy: Partial<EnergyLevels> = input.energy ?? {
    pagi: 3,
    siang: 3,
    malam: 3,
  }

  const preservedBlocks = (input.existingBlocks ?? []).filter((b) => {
    if (b.dikunci || b.dimodifikasi_manusia) {
      return true
    }
    if (input.replanTodayOnly) {
      const bStart = new Date(b.mulai)
      if (bStart.toDateString() !== nowDate.toDateString()) {
        return true
      }
      if (bStart.getTime() < nowDate.getTime()) {
        return true
      }
    }
    return false
  })

  const grid = buildTimeGrid(weekStartDate, activeHours, energy)
  const fixedIntervals = getFixedEventIntervals(input.fixedEvents, weekStartDate)
  const preservedIntervals: TimeInterval[] = preservedBlocks.map((b) => ({
    start: new Date(b.mulai),
    end: new Date(b.selesai),
  }))
  const staticBlockedIntervals = [...fixedIntervals, ...preservedIntervals]

  const unblockedSlots = grid.filter((slot) => {
    if (
      input.replanTodayOnly &&
      (slot.start.toDateString() !== nowDate.toDateString() ||
        slot.start.getTime() < nowDate.getTime())
    ) {
      return false
    }
    return !staticBlockedIntervals.some((bi) =>
      isIntervalOverlapping(slot.start, slot.end, bi.start, bi.end)
    )
  })
  const totalAvailableMinutes = unblockedSlots.length * 30

  const activeTasks = input.tasks.filter(
    (t) => t.status !== 'selesai' && t.status !== 'done'
  )
  const totalRequiredMinutes = activeTasks.reduce((sum, t) => {
    if (input.replanTodayOnly) {
      const presMin = preservedBlocks
        .filter((b) => b.task_id === t.id)
        .reduce(
          (s, b) =>
            s +
            (new Date(b.selesai).getTime() - new Date(b.mulai).getTime()) /
              60000,
          0
        )
      const rem = Math.max(0, (t.durasi_menit ?? 60) - presMin)
      return sum + rem
    }
    return sum + (t.durasi_menit ?? 60)
  }, 0)

  const tasksWithPriority = activeTasks.map((t) => ({
    task: t,
    priority: calculatePriority(t, nowDate),
  }))

  tasksWithPriority.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority
    }
    const aDeadline = a.task.deadline
      ? new Date(a.task.deadline).getTime()
      : Number.MAX_SAFE_INTEGER
    const bDeadline = b.task.deadline
      ? new Date(b.task.deadline).getTime()
      : Number.MAX_SAFE_INTEGER
    if (aDeadline !== bDeadline) {
      return aDeadline - bDeadline
    }
    const titleCompare = a.task.judul.localeCompare(b.task.judul)
    if (titleCompare !== 0) {
      return titleCompare
    }
    return a.task.id.localeCompare(b.task.id)
  })

  const dailyMinutes = [0, 0, 0, 0, 0, 0, 0]
  for (const pb of preservedBlocks) {
    const pbStart = new Date(pb.mulai)
    const pbEnd = new Date(pb.selesai)
    const dayIdx = Math.floor(
      (pbStart.getTime() - weekStartDate.getTime()) / (24 * 60 * 60 * 1000)
    )
    if (dayIdx >= 0 && dayIdx < 7) {
      const dur = (pbEnd.getTime() - pbStart.getTime()) / 60000
      dailyMinutes[dayIdx] += dur
    }
  }

  const allScheduledBlocks: ScheduleBlock[] = [...preservedBlocks]
  const blockIntervals: TimeInterval[] = preservedIntervals.map((i) => ({ ...i }))
  const unplaced: UnplacedTask[] = []

  const activeHoursEndMinutes = parseTimeToMinutes(activeHours.end)

  for (const item of tasksWithPriority) {
    const task = item.task
    const preservedMinutesForTask = preservedBlocks
      .filter((b) => b.task_id === task.id)
      .reduce(
        (sum, b) =>
          sum +
          (new Date(b.selesai).getTime() - new Date(b.mulai).getTime()) / 60000,
        0
      )
    const taskDurationNeeded = (task.durasi_menit ?? 60) - preservedMinutesForTask
    if (taskDurationNeeded <= 0) {
      continue
    }

    const taskToSchedule: Task = {
      ...task,
      durasi_menit: taskDurationNeeded,
    }
    const sessions = splitTask(taskToSchedule)
    let canFitAllSessions = true
    const tempAllocations: Array<{
      block: ScheduleBlock
      interval: TimeInterval
      dayIdx: number
      duration: number
    }> = []

    for (let sIdx = 0; sIdx < sessions.length; sIdx++) {
      const sessionDuration = sessions[sIdx] ?? 60
      const currentBlockIntervals = [
        ...blockIntervals,
        ...tempAllocations.map((a) => a.interval),
      ]

      const candidateSlots = grid.filter((slot) => {
        const start = slot.start
        const end = new Date(start.getTime() + sessionDuration * 60000)
        const dayIdx = slot.dayIndex

        if (start.getTime() < nowDate.getTime()) {
          return false
        }

        if (
          input.replanTodayOnly &&
          start.toDateString() !== nowDate.toDateString()
        ) {
          return false
        }

        const dayEnd = new Date(
          weekStartDate.getTime() +
            dayIdx * 86400000 +
            activeHoursEndMinutes * 60000
        )
        if (end.getTime() > dayEnd.getTime()) {
          return false
        }

        if (task.deadline) {
          const deadlineTime = new Date(task.deadline).getTime()
          if (end.getTime() > deadlineTime) {
            return false
          }
        }

        const dayMinutesUsed =
          dailyMinutes[dayIdx] +
          tempAllocations
            .filter((a) => a.dayIdx === dayIdx)
            .reduce((sum, a) => sum + a.duration, 0)

        if (dayMinutesUsed + sessionDuration > 360) {
          return false
        }

        if (
          staticBlockedIntervals.some((bi) =>
            isIntervalOverlapping(start, end, bi.start, bi.end)
          )
        ) {
          return false
        }

        if (
          currentBlockIntervals.some((bi) =>
            hasBufferViolation(start, end, bi.start, bi.end, 10)
          )
        ) {
          return false
        }

        return true
      })

      let finalCandidateSlots = candidateSlots
      if (finalCandidateSlots.length === 0 && sessionDuration <= 360) {
        finalCandidateSlots = grid.filter((slot) => {
          const start = slot.start
          const end = new Date(start.getTime() + sessionDuration * 60000)
          const dayIdx = slot.dayIndex

          if (start.getTime() < nowDate.getTime()) {
            return false
          }

          if (
            input.replanTodayOnly &&
            start.toDateString() !== nowDate.toDateString()
          ) {
            return false
          }

          const dayEnd = new Date(
            weekStartDate.getTime() +
              dayIdx * 86400000 +
              activeHoursEndMinutes * 60000
          )
          if (end.getTime() > dayEnd.getTime()) {
            return false
          }

          if (task.deadline) {
            const deadlineTime = new Date(task.deadline).getTime()
            if (end.getTime() > deadlineTime) {
              return false
            }
          }

          if (
            staticBlockedIntervals.some((bi) =>
              isIntervalOverlapping(start, end, bi.start, bi.end)
            )
          ) {
            return false
          }

          if (
            currentBlockIntervals.some((bi) =>
              hasBufferViolation(start, end, bi.start, bi.end, 10)
            )
          ) {
            return false
          }

          return true
        })
      }

      if (finalCandidateSlots.length === 0) {
        canFitAllSessions = false
        const reason = determineUnplacedReason(
          task,
          sessionDuration,
          nowDate,
          staticBlockedIntervals,
          grid,
          dailyMinutes
        )
        unplaced.push({ task, reason })
        break
      }

      const isHardTask = (task.kesulitan ?? 3) >= 4
      finalCandidateSlots.sort((a, b) => {
        if (isHardTask && b.energyScore !== a.energyScore) {
          return b.energyScore - a.energyScore
        }
        return a.start.getTime() - b.start.getTime()
      })

      const chosenSlot = finalCandidateSlots[0]
      if (!chosenSlot) {
        canFitAllSessions = false
        unplaced.push({ task, reason: 'tidak muat' })
        break
      }

      const chosenStart = chosenSlot.start
      const chosenEnd = new Date(chosenStart.getTime() + sessionDuration * 60000)
      const sessionSuffix = sessions.length > 1 ? ` (Sesi ${sIdx + 1}/${sessions.length})` : ''

      const newBlock: ScheduleBlock = {
        id: `block-${task.id}-${sIdx}`,
        user_id: task.user_id,
        task_id: task.id,
        mulai: chosenStart.toISOString(),
        selesai: chosenEnd.toISOString(),
        dikunci: false,
        dimodifikasi_manusia: false,
        alasan_ai: `Dijadwalkan otomatis pada jendela ${chosenSlot.window}${sessionSuffix} berdasarkan prioritas (${item.priority.toFixed(2)}).`,
      }

      tempAllocations.push({
        block: newBlock,
        interval: { start: chosenStart, end: chosenEnd },
        dayIdx: chosenSlot.dayIndex,
        duration: sessionDuration,
      })
    }

    if (canFitAllSessions) {
      for (const alloc of tempAllocations) {
        allScheduledBlocks.push(alloc.block)
        blockIntervals.push(alloc.interval)
        dailyMinutes[alloc.dayIdx] += alloc.duration
      }
    }
  }

  allScheduledBlocks.sort(
    (a, b) => new Date(a.mulai).getTime() - new Date(b.mulai).getTime()
  )

  return {
    blocks: allScheduledBlocks,
    unplaced,
    totalRequiredMinutes,
    totalAvailableMinutes,
  }
}
