import { describe, expect, it } from 'vitest'
import { validateFixedEventOverlap } from './overlap'
import type { FixedEvent } from '@/lib/types'

describe('validateFixedEventOverlap', () => {
  const fixedEvents: FixedEvent[] = [
    {
      id: 'fe-1',
      user_id: 'user-1',
      judul: 'Kuliah Pemrograman Web',
      hari: 1, // Senin
      jam_mulai: '08:00:00',
      jam_selesai: '10:00:00',
    },
    {
      id: 'fe-2',
      user_id: 'user-1',
      judul: 'Praktikum Jaringan Komputer',
      hari: 3, // Rabu
      jam_mulai: '13:00:00',
      jam_selesai: '15:30:00',
    },
  ]

  it('detects exact overlap with fixed event on Monday', () => {
    // 2026-10-12 is Monday
    const start = new Date('2026-10-12T08:00:00')
    const end = new Date('2026-10-12T10:00:00')

    const res = validateFixedEventOverlap(start, end, fixedEvents)
    expect(res.hasOverlap).toBe(true)
    expect(res.conflictingEvent?.judul).toBe('Kuliah Pemrograman Web')
  })

  it('detects partial overlap when block starts before and ends inside fixed event', () => {
    const start = new Date('2026-10-12T07:30:00')
    const end = new Date('2026-10-12T08:30:00')

    const res = validateFixedEventOverlap(start, end, fixedEvents)
    expect(res.hasOverlap).toBe(true)
    expect(res.conflictingEvent?.id).toBe('fe-1')
  })

  it('detects partial overlap when block starts inside and ends after fixed event', () => {
    const start = new Date('2026-10-12T09:30:00')
    const end = new Date('2026-10-12T10:30:00')

    const res = validateFixedEventOverlap(start, end, fixedEvents)
    expect(res.hasOverlap).toBe(true)
    expect(res.conflictingEvent?.id).toBe('fe-1')
  })

  it('detects overlap when block completely encloses fixed event', () => {
    const start = new Date('2026-10-12T07:00:00')
    const end = new Date('2026-10-12T11:00:00')

    const res = validateFixedEventOverlap(start, end, fixedEvents)
    expect(res.hasOverlap).toBe(true)
    expect(res.conflictingEvent?.id).toBe('fe-1')
  })

  it('returns false when block is strictly before fixed event on the same day', () => {
    const start = new Date('2026-10-12T06:00:00')
    const end = new Date('2026-10-12T08:00:00')

    const res = validateFixedEventOverlap(start, end, fixedEvents)
    expect(res.hasOverlap).toBe(false)
  })

  it('returns false when block is strictly after fixed event on the same day', () => {
    const start = new Date('2026-10-12T10:00:00')
    const end = new Date('2026-10-12T12:00:00')

    const res = validateFixedEventOverlap(start, end, fixedEvents)
    expect(res.hasOverlap).toBe(false)
  })

  it('returns false when block has identical hours but is on a different day', () => {
    // 2026-10-13 is Tuesday (hari 2)
    const start = new Date('2026-10-13T08:00:00')
    const end = new Date('2026-10-13T10:00:00')

    const res = validateFixedEventOverlap(start, end, fixedEvents)
    expect(res.hasOverlap).toBe(false)
  })

  it('supports ISO string inputs', () => {
    const res = validateFixedEventOverlap(
      '2026-10-14T14:00:00', // Wednesday (hari 3)
      '2026-10-14T15:00:00',
      fixedEvents
    )
    expect(res.hasOverlap).toBe(true)
    expect(res.conflictingEvent?.judul).toBe('Praktikum Jaringan Komputer')
  })
})
