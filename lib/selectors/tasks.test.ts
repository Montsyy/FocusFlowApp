import { describe, it, expect } from 'vitest'
import { calculateCompletionRate } from './tasks'
import type { Task } from '@/lib/types'

function makeMockTask(id: string, status: string): Task {
  return {
    id,
    user_id: 'user-1',
    judul: `Task ${id}`,
    deadline: null,
    durasi_menit: 60,
    kesulitan: 3,
    kepentingan: 3,
    can_split: false,
    sesi_disarankan: 1,
    status,
    created_at: new Date().toISOString(),
  }
}

describe('calculateCompletionRate selector', () => {
  it('returns 0 when task list is empty', () => {
    expect(calculateCompletionRate([])).toBe(0)
  })

  it('returns 100 when all tasks are done', () => {
    const tasks = [
      makeMockTask('1', 'done'),
      makeMockTask('2', 'selesai'),
    ]
    expect(calculateCompletionRate(tasks)).toBe(100)
  })

  it('returns 0 when no tasks are completed', () => {
    const tasks = [
      makeMockTask('1', 'todo'),
      makeMockTask('2', 'in_progress'),
    ]
    expect(calculateCompletionRate(tasks)).toBe(0)
  })

  it('computes correct percentage and rounds properly', () => {
    const tasks = [
      makeMockTask('1', 'done'),
      makeMockTask('2', 'todo'),
      makeMockTask('3', 'todo'),
    ]
    expect(calculateCompletionRate(tasks)).toBe(33)
  })

  it('handles half completed tasks correctly', () => {
    const tasks = [
      makeMockTask('1', 'done'),
      makeMockTask('2', 'todo'),
    ]
    expect(calculateCompletionRate(tasks)).toBe(50)
  })
})
