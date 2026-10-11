import type { Task } from '@/lib/types'

export interface PriorityComponents {
  urgensi: number
  kepentingan: number
  kesulitan: number
  progres_tertunda: number
  total: number
}

export function calculateUrgency(deadline: string | null | undefined, now: Date): number {
  if (!deadline) {
    return 0
  }
  const deadlineTime = new Date(deadline).getTime()
  const nowTime = now.getTime()
  const diffHours = (deadlineTime - nowTime) / (1000 * 60 * 60)
  if (diffHours <= 0) {
    return 1
  }
  if (diffHours >= 168) {
    return 0
  }
  return Number((1 - diffHours / 168).toFixed(4))
}

export function normalizeKepentingan(kepentingan: number | null | undefined): number {
  const k = kepentingan ?? 3
  const clamped = Math.min(5, Math.max(1, k))
  return Number(((clamped - 1) / 4).toFixed(4))
}

export function normalizeKesulitan(kesulitan: number | null | undefined): number {
  const d = kesulitan ?? 3
  const clamped = Math.min(5, Math.max(1, d))
  return Number(((clamped - 1) / 4).toFixed(4))
}

export function calculateProgresTertunda(task: Task): number {
  if (task.status === 'in_progress') {
    return 1
  }
  return 0
}

export function getPriorityComponents(task: Task, now: Date = new Date()): PriorityComponents {
  const urgensi = calculateUrgency(task.deadline, now)
  const kepentingan = normalizeKepentingan(task.kepentingan)
  const kesulitan = normalizeKesulitan(task.kesulitan)
  const progres_tertunda = calculateProgresTertunda(task)

  const total = Number(
    (urgensi * 0.4 + kepentingan * 0.3 + kesulitan * 0.2 + progres_tertunda * 0.1).toFixed(4)
  )

  return {
    urgensi,
    kepentingan,
    kesulitan,
    progres_tertunda,
    total,
  }
}

export function calculatePriority(task: Task, now: Date = new Date()): number {
  return getPriorityComponents(task, now).total
}
