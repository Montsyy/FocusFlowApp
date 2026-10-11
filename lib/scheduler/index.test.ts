import { describe, expect, it } from 'vitest'
import { schedule, splitTask } from './index'
import { calculatePriority, getPriorityComponents } from './priority'
import { getFixedEventIntervals, isIntervalOverlapping } from './slots'
import type { FixedEvent, ScheduleBlock, Task } from '@/lib/types'

const BASE_WEEK_START = '2026-10-12T00:00:00.000Z'
const BASE_NOW = '2026-10-12T07:00:00.000Z'

function createSampleTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    judul: 'Tugas Kalkulus',
    deadline: '2026-10-16T22:00:00.000Z',
    durasi_menit: 60,
    kesulitan: 3,
    kepentingan: 3,
    can_split: false,
    sesi_disarankan: 1,
    status: 'todo',
    created_at: '2026-10-11T10:00:00.000Z',
    ...overrides,
  }
}

function createSampleFixedEvent(overrides: Partial<FixedEvent> = {}): FixedEvent {
  return {
    id: 'fixed-1',
    user_id: 'user-1',
    judul: 'Kuliah Fisika Dasar',
    hari: 1,
    jam_mulai: '08:00:00',
    jam_selesai: '10:00:00',
    ...overrides,
  }
}

describe('deterministic scheduler', () => {
  it('calculates priority components and score deterministically', () => {
    const task = createSampleTask({
      deadline: '2026-10-14T07:00:00.000Z',
      kepentingan: 5,
      kesulitan: 4,
      status: 'in_progress',
    })
    const now = new Date(BASE_NOW)
    const components = getPriorityComponents(task, now)
    const score = calculatePriority(task, now)

    expect(components.urgensi).toBeGreaterThan(0)
    expect(components.kepentingan).toBe(1)
    expect(components.kesulitan).toBe(0.75)
    expect(components.progres_tertunda).toBe(1)
    expect(components.total).toBe(score)
    expect(score).toBeGreaterThan(0.7)
  })

  it('splits tasks with can_split into sessions of at most 90 minutes', () => {
    const task180 = createSampleTask({ durasi_menit: 180, can_split: true })
    const sessions180 = splitTask(task180)
    expect(sessions180).toEqual([90, 90])
    expect(sessions180.every((s) => s <= 90)).toBe(true)

    const task120 = createSampleTask({ durasi_menit: 120, can_split: true, sesi_disarankan: 2 })
    const sessions120 = splitTask(task120)
    expect(sessions120).toEqual([60, 60])
    expect(sessions120.every((s) => s <= 90)).toBe(true)

    const taskNoSplit = createSampleTask({ durasi_menit: 150, can_split: false })
    const sessionsNoSplit = splitTask(taskNoSplit)
    expect(sessionsNoSplit).toEqual([150])
  })

  it('ensures no blocks overlap with each other or fixed events', () => {
    const fixedEvent = createSampleFixedEvent({
      hari: 1,
      jam_mulai: '08:00:00',
      jam_selesai: '10:00:00',
    })
    const task1 = createSampleTask({ id: 't1', durasi_menit: 90 })
    const task2 = createSampleTask({ id: 't2', durasi_menit: 60 })

    const res = schedule({
      tasks: [task1, task2],
      fixedEvents: [fixedEvent],
      weekStart: BASE_WEEK_START,
      now: BASE_NOW,
    })

    expect(res.blocks.length).toBe(2)
    const b1Start = new Date(res.blocks[0]!.mulai).getTime()
    const b1End = new Date(res.blocks[0]!.selesai).getTime()
    const b2Start = new Date(res.blocks[1]!.mulai).getTime()
    const b2End = new Date(res.blocks[1]!.selesai).getTime()

    expect(b1End <= b2Start || b2End <= b1Start).toBe(true)

    const feIntervals = getFixedEventIntervals([fixedEvent], new Date(BASE_WEEK_START))
    for (const b of res.blocks) {
      const bStart = new Date(b.mulai)
      const bEnd = new Date(b.selesai)
      for (const fe of feIntervals) {
        expect(isIntervalOverlapping(bStart, bEnd, fe.start, fe.end)).toBe(false)
      }
    }
  })

  it('respects task deadlines and never places a block after its deadline', () => {
    const deadline = '2026-10-12T10:00:00.000Z'
    const task = createSampleTask({
      id: 'tight-deadline',
      deadline,
      durasi_menit: 60,
    })

    const res = schedule({
      tasks: [task],
      fixedEvents: [],
      weekStart: BASE_WEEK_START,
      now: BASE_NOW,
    })

    expect(res.blocks.length).toBe(1)
    const blockEnd = new Date(res.blocks[0]!.selesai).getTime()
    expect(blockEnd).toBeLessThanOrEqual(new Date(deadline).getTime())
  })

  it('keeps preserved blocks untouched with identical data', () => {
    const preserved: ScheduleBlock = {
      id: 'preserved-1',
      user_id: 'user-1',
      task_id: 'task-locked',
      mulai: '2026-10-12T10:00:00.000Z',
      selesai: '2026-10-12T11:30:00.000Z',
      dikunci: true,
      dimodifikasi_manusia: false,
      alasan_ai: 'Manual lock',
    }

    const task = createSampleTask({ id: 't-new', durasi_menit: 60 })

    const res = schedule({
      tasks: [task],
      fixedEvents: [],
      existingBlocks: [preserved],
      weekStart: BASE_WEEK_START,
      now: BASE_NOW,
    })

    const foundPreserved = res.blocks.find((b) => b.id === 'preserved-1')
    expect(foundPreserved).toBeDefined()
    expect(foundPreserved?.mulai).toBe(preserved.mulai)
    expect(foundPreserved?.selesai).toBe(preserved.selesai)
    expect(foundPreserved?.dikunci).toBe(true)
  })

  it('respects the 10-minute buffer between consecutive blocks', () => {
    const task1 = createSampleTask({ id: 't1', durasi_menit: 60 })
    const task2 = createSampleTask({ id: 't2', durasi_menit: 60 })

    const res = schedule({
      tasks: [task1, task2],
      fixedEvents: [],
      weekStart: BASE_WEEK_START,
      now: BASE_NOW,
    })

    expect(res.blocks.length).toBe(2)
    const sorted = [...res.blocks].sort(
      (a, b) => new Date(a.mulai).getTime() - new Date(b.mulai).getTime()
    )

    const gapMinutes =
      (new Date(sorted[1]!.mulai).getTime() - new Date(sorted[0]!.selesai).getTime()) /
      60000

    expect(gapMinutes).toBeGreaterThanOrEqual(10)
  })

  it('respects the daily cap of 6 hours (360 minutes) of task work', () => {
    const tasks = [
      createSampleTask({ id: 't1', durasi_menit: 120, can_split: false }),
      createSampleTask({ id: 't2', durasi_menit: 120, can_split: false }),
      createSampleTask({ id: 't3', durasi_menit: 120, can_split: false }),
      createSampleTask({ id: 't4', durasi_menit: 60, can_split: false }),
    ]

    const res = schedule({
      tasks,
      fixedEvents: [],
      weekStart: BASE_WEEK_START,
      now: BASE_NOW,
    })

    expect(res.blocks.length).toBe(4)

    const minutesPerDay = new Map<number, number>()
    for (const b of res.blocks) {
      const start = new Date(b.mulai)
      const day = start.getDay()
      const dur = (new Date(b.selesai).getTime() - start.getTime()) / 60000
      minutesPerDay.set(day, (minutesPerDay.get(day) ?? 0) + dur)
    }

    for (const minutes of minutesPerDay.values()) {
      expect(minutes).toBeLessThanOrEqual(360)
    }
  })

  it('places tasks with kesulitan >= 4 into the highest energy window', () => {
    const hardTask = createSampleTask({
      id: 'hard-task',
      kesulitan: 5,
      durasi_menit: 60,
    })

    const res = schedule({
      tasks: [hardTask],
      fixedEvents: [],
      energy: { pagi: 5, siang: 2, malam: 3 },
      weekStart: BASE_WEEK_START,
      now: BASE_NOW,
    })

    expect(res.blocks.length).toBe(1)
    const blockStart = new Date(res.blocks[0]!.mulai)
    const blockHour = blockStart.getHours()
    expect(blockHour).toBeGreaterThanOrEqual(6)
    expect(blockHour).toBeLessThan(12)
  })

  it('skips completed tasks with status selesai or done', () => {
    const doneTask = createSampleTask({ id: 't-done', status: 'done' })
    const selesaiTask = createSampleTask({ id: 't-selesai', status: 'selesai' })
    const todoTask = createSampleTask({ id: 't-todo', status: 'todo' })

    const res = schedule({
      tasks: [doneTask, selesaiTask, todoTask],
      fixedEvents: [],
      weekStart: BASE_WEEK_START,
      now: BASE_NOW,
    })

    expect(res.blocks.length).toBe(1)
    expect(res.blocks[0]?.task_id).toBe('t-todo')
    expect(res.unplaced.length).toBe(0)
  })

  it('marks tasks that cannot fit as unplaced with accurate reasons', () => {
    const pastTask = createSampleTask({
      id: 'past',
      deadline: '2026-10-10T12:00:00.000Z',
    })

    const hugeTask = createSampleTask({
      id: 'huge',
      durasi_menit: 420,
      can_split: false,
    })

    const res = schedule({
      tasks: [pastTask, hugeTask],
      fixedEvents: [],
      weekStart: BASE_WEEK_START,
      now: BASE_NOW,
    })

    expect(res.unplaced.length).toBe(2)
    const pastUnplaced = res.unplaced.find((u) => u.task.id === 'past')
    const hugeUnplaced = res.unplaced.find((u) => u.task.id === 'huge')

    expect(pastUnplaced?.reason).toBe('melewati deadline')
    expect(hugeUnplaced?.reason).toBe('melebihi batas harian')
  })

  it('produces identical output for identical input deterministically', () => {
    const taskA = createSampleTask({ id: 'ta', judul: 'Analisis Real', kesulitan: 4 })
    const taskB = createSampleTask({ id: 'tb', judul: 'Aljabar Linear', kesulitan: 2 })

    const input = {
      tasks: [taskA, taskB],
      fixedEvents: [createSampleFixedEvent()],
      energy: { pagi: 4, siang: 3, malam: 2 },
      weekStart: BASE_WEEK_START,
      now: BASE_NOW,
    }

    const run1 = schedule(input)
    const run2 = schedule(input)

    expect(run1).toEqual(run2)
  })

  describe('table-driven edge cases', () => {
    const cases = [
      {
        name: 'empty week with no tasks and no events',
        input: {
          tasks: [],
          fixedEvents: [],
          weekStart: BASE_WEEK_START,
          now: BASE_NOW,
        },
        expectedBlocksCount: 0,
        expectedUnplacedCount: 0,
      },
      {
        name: 'deadline already in the past',
        input: {
          tasks: [
            createSampleTask({
              id: 'expired',
              deadline: '2026-10-11T23:59:59.000Z',
            }),
          ],
          fixedEvents: [],
          weekStart: BASE_WEEK_START,
          now: BASE_NOW,
        },
        expectedBlocksCount: 0,
        expectedUnplacedCount: 1,
      },
      {
        name: 'full week with completely blocked active hours',
        input: {
          tasks: [createSampleTask({ id: 'blocked-task', durasi_menit: 60 })],
          fixedEvents: [0, 1, 2, 3, 4, 5, 6].map((day) =>
            createSampleFixedEvent({
              id: `full-day-${day}`,
              hari: day,
              jam_mulai: '07:00:00',
              jam_selesai: '22:00:00',
            })
          ),
          weekStart: BASE_WEEK_START,
          now: BASE_NOW,
        },
        expectedBlocksCount: 0,
        expectedUnplacedCount: 1,
      },
    ]

    for (const testCase of cases) {
      it(testCase.name, () => {
        const result = schedule(testCase.input)
        expect(result.blocks.length).toBe(testCase.expectedBlocksCount)
        expect(result.unplaced.length).toBe(testCase.expectedUnplacedCount)
      })
    }
  })
})
