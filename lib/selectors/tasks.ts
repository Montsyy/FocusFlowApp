import type { Task } from '@/lib/types'

export function calculateCompletionRate(tasks: Task[]): number {
  if (!tasks || tasks.length === 0) {
    return 0
  }

  const completed = tasks.filter(
    (t) => t.status === 'done' || (t.status as string) === 'selesai'
  )

  return Math.round((completed.length / tasks.length) * 100)
}
