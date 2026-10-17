import { describe, expect, it } from 'vitest'
import { computeWeeklyStats } from './reflection'
import type { Task, ScheduleBlock, EnergyLog } from '@/lib/types'

function createSampleTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    judul: 'Tugas Matematika Diskrit',
    deadline: '2026-10-15T22:00:00.000Z',
    durasi_menit: 90,
    kesulitan: 3,
    kepentingan: 4,
    can_split: false,
    sesi_disarankan: 1,
    status: 'todo',
    created_at: '2026-10-11T10:00:00.000Z',
    ...overrides,
  }
}

describe('computeWeeklyStats', () => {
  const weekStart = '2026-10-11'
  const referenceNow = '2026-10-17T20:00:00.000Z'

  it('calculates 100% completion rate when all tasks are completed', () => {
    const tasks: Task[] = [
      createSampleTask({ id: 't1', status: 'done' }),
      createSampleTask({ id: 't2', status: 'selesai' }),
    ]

    const stats = computeWeeklyStats({
      tasks,
      blocks: [],
      weekStart,
      now: referenceNow,
    })

    expect(stats.totalTasks).toBe(2)
    expect(stats.completedTasks).toBe(2)
    expect(stats.missedTasks).toBe(0)
    expect(stats.completionRate).toBe(100)
  })

  it('calculates partial completion rate and identifies missed tasks', () => {
    const tasks: Task[] = [
      createSampleTask({ id: 't1', status: 'done' }),
      createSampleTask({ id: 't2', status: 'todo', deadline: '2026-10-14T10:00:00.000Z' }),
      createSampleTask({ id: 't3', status: 'todo', deadline: '2026-10-25T10:00:00.000Z' }),
      createSampleTask({ id: 't4', status: 'in_progress', deadline: '2026-10-16T12:00:00.000Z' }),
    ]

    const stats = computeWeeklyStats({
      tasks,
      blocks: [],
      weekStart,
      now: referenceNow,
    })

    expect(stats.totalTasks).toBe(4)
    expect(stats.completedTasks).toBe(1)
    expect(stats.missedTasks).toBe(2)
    expect(stats.completionRate).toBe(25)
  })

  it('calculates total focus minutes, hours, and detects morning as most productive window', () => {
    const d1Start = new Date('2026-10-12T00:00:00')
    d1Start.setHours(8, 0, 0, 0)
    const d1End = new Date('2026-10-12T00:00:00')
    d1End.setHours(10, 0, 0, 0)

    const d2Start = new Date('2026-10-13T00:00:00')
    d2Start.setHours(9, 0, 0, 0)
    const d2End = new Date('2026-10-13T00:00:00')
    d2End.setHours(10, 30, 0, 0)

    const d3Start = new Date('2026-10-14T00:00:00')
    d3Start.setHours(14, 0, 0, 0)
    const d3End = new Date('2026-10-14T00:00:00')
    d3End.setHours(15, 0, 0, 0)

    const blocks: ScheduleBlock[] = [
      {
        id: 'b1',
        user_id: 'user-1',
        task_id: 't1',
        mulai: d1Start.toISOString(),
        selesai: d1End.toISOString(),
        dikunci: false,
        dimodifikasi_manusia: false,
        alasan_ai: 'Pagi',
      },
      {
        id: 'b2',
        user_id: 'user-1',
        task_id: 't2',
        mulai: d2Start.toISOString(),
        selesai: d2End.toISOString(),
        dikunci: false,
        dimodifikasi_manusia: false,
        alasan_ai: 'Pagi lagi',
      },
      {
        id: 'b3',
        user_id: 'user-1',
        task_id: 't3',
        mulai: d3Start.toISOString(),
        selesai: d3End.toISOString(),
        dikunci: false,
        dimodifikasi_manusia: false,
        alasan_ai: 'Siang',
      },
    ]

    const stats = computeWeeklyStats({
      tasks: [],
      blocks,
      weekStart,
      now: referenceNow,
    })

    expect(stats.totalFocusMinutes).toBe(270)
    expect(stats.totalFocusHours).toBe(4.5)
    expect(stats.mostProductiveTimeWindow).toBe('pagi')
  })

  it('detects evening or afternoon window when respective blocks have higher duration', () => {
    const dNightStart = new Date('2026-10-12T00:00:00')
    dNightStart.setHours(19, 0, 0, 0)
    const dNightEnd = new Date('2026-10-12T00:00:00')
    dNightEnd.setHours(21, 30, 0, 0)

    const dMornStart = new Date('2026-10-13T00:00:00')
    dMornStart.setHours(8, 0, 0, 0)
    const dMornEnd = new Date('2026-10-13T00:00:00')
    dMornEnd.setHours(9, 0, 0, 0)

    const blocks: ScheduleBlock[] = [
      {
        id: 'b1',
        user_id: 'user-1',
        task_id: 't1',
        mulai: dNightStart.toISOString(),
        selesai: dNightEnd.toISOString(),
        dikunci: false,
        dimodifikasi_manusia: false,
        alasan_ai: 'Malam',
      },
      {
        id: 'b2',
        user_id: 'user-1',
        task_id: 't2',
        mulai: dMornStart.toISOString(),
        selesai: dMornEnd.toISOString(),
        dikunci: false,
        dimodifikasi_manusia: false,
        alasan_ai: 'Pagi',
      },
    ]

    const stats = computeWeeklyStats({
      tasks: [],
      blocks,
      weekStart,
      now: referenceNow,
    })

    expect(stats.mostProductiveTimeWindow).toBe('malam')
  })

  it('calculates average energy from energy logs accurately', () => {
    const energyLogs: EnergyLog[] = [
      {
        id: 'e1',
        user_id: 'user-1',
        tanggal: '2026-10-12',
        pagi: 5,
        siang: 4,
        malam: 3,
        mood: 'semangat',
      },
      {
        id: 'e2',
        user_id: 'user-1',
        tanggal: '2026-10-13',
        pagi: 4,
        siang: 3,
        malam: 2,
        mood: 'fokus',
      },
    ]

    const stats = computeWeeklyStats({
      tasks: [],
      blocks: [],
      energyLogs,
      weekStart,
      now: referenceNow,
    })

    expect(stats.energyAverage).toBe(3.5)
  })

  it('handles empty data gracefully with safe zero defaults', () => {
    const stats = computeWeeklyStats({
      tasks: [],
      blocks: [],
      weekStart,
      now: referenceNow,
    })

    expect(stats.totalTasks).toBe(0)
    expect(stats.completedTasks).toBe(0)
    expect(stats.missedTasks).toBe(0)
    expect(stats.completionRate).toBe(0)
    expect(stats.totalFocusMinutes).toBe(0)
    expect(stats.totalFocusHours).toBe(0)
    expect(stats.mostProductiveTimeWindow).toBe('pagi')
    expect(stats.energyAverage).toBe(3.0)
  })
})
