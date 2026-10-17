import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { POST } from './route'
import * as authModule from '@/lib/supabase/auth'
import * as aiModule from '@/lib/ai'
import type { Task, ScheduleBlock, EnergyLog } from '@/lib/types'

vi.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}))

describe('POST /api/reflect', () => {
  const mockUserId = 'user-reflect-uuid'

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      user_id: mockUserId,
      judul: 'Tugas Matematika',
      deadline: '2026-10-15T22:00:00.000Z',
      durasi_menit: 90,
      kesulitan: 3,
      kepentingan: 4,
      can_split: false,
      sesi_disarankan: 1,
      status: 'done',
      created_at: '2026-10-11T10:00:00.000Z',
    },
    {
      id: 'task-2',
      user_id: mockUserId,
      judul: 'Laporan Fisika',
      deadline: '2026-10-14T22:00:00.000Z',
      durasi_menit: 60,
      kesulitan: 4,
      kepentingan: 4,
      can_split: false,
      sesi_disarankan: 1,
      status: 'todo',
      created_at: '2026-10-11T10:00:00.000Z',
    },
  ]

  const mockStart = new Date('2026-10-12T00:00:00')
  mockStart.setHours(8, 0, 0, 0)
  const mockEnd = new Date('2026-10-12T00:00:00')
  mockEnd.setHours(9, 30, 0, 0)

  const mockBlocks: ScheduleBlock[] = [
    {
      id: 'b1',
      user_id: mockUserId,
      task_id: 'task-1',
      mulai: mockStart.toISOString(),
      selesai: mockEnd.toISOString(),
      dikunci: false,
      dimodifikasi_manusia: false,
      alasan_ai: 'Pagi hari',
    },
  ]

  const mockEnergyLogs: EnergyLog[] = [
    {
      id: 'e1',
      user_id: mockUserId,
      tanggal: '2026-10-12',
      pagi: 5,
      siang: 4,
      malam: 3,
      mood: 'semangat',
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
            }),
          }
        }
        if (table === 'schedule_blocks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lt: vi.fn().mockResolvedValue({ data: mockBlocks, error: null }),
                }),
              }),
            }),
          }
        }
        if (table === 'energy_logs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lte: vi.fn().mockResolvedValue({ data: mockEnergyLogs, error: null }),
                }),
              }),
            }),
          }
        }
        return {}
      }),
    }

    const mockUser = { id: mockUserId } as unknown as User
    const mockClient = mockSupabase as unknown as SupabaseClient

    vi.spyOn(authModule, 'getAuthenticatedUser').mockResolvedValue({
      user: mockUser,
      response: null,
      supabase: mockClient,
    })
  })

  it('returns 401 Unauthorized when user is unauthenticated', async () => {
    const mockClient = {} as unknown as SupabaseClient
    vi.spyOn(authModule, 'getAuthenticatedUser').mockResolvedValueOnce({
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      supabase: mockClient,
    })

    const req = new Request('http://localhost:3000/api/reflect', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('gathers data, computes weekly stats in code, and returns AI reflection', async () => {
    vi.spyOn(aiModule, 'reflectWeek').mockResolvedValueOnce({
      data: {
        summary: 'Pencapaian minggu ini cukup baik dengan fokus di pagi hari.',
        best_time_window: 'pagi',
        reflection_question: 'Bagaimana caramu mempertahankan konsistensi ini minggu depan?',
      },
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      attempts: 1,
      fallbackUsed: false,
    })

    const req = new Request('http://localhost:3000/api/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart: '2026-10-11',
        now: '2026-10-17T20:00:00.000Z',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.stats).toBeDefined()
    expect(json.stats.totalTasks).toBe(2)
    expect(json.stats.completedTasks).toBe(1)
    expect(json.stats.missedTasks).toBe(1)
    expect(json.stats.completionRate).toBe(50)
    expect(json.stats.totalFocusHours).toBe(1.5)
    expect(json.stats.mostProductiveTimeWindow).toBe('pagi')

    expect(json.reflection).toBeDefined()
    expect(json.reflection.summary).toContain('Pencapaian minggu ini cukup baik')
    expect(json.meta).toEqual({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      attempts: 1,
      fallbackUsed: false,
    })
  })

  it('gracefully falls back to template reflection when Gemini fails', async () => {
    vi.spyOn(aiModule, 'reflectWeek').mockResolvedValueOnce({
      data: {
        summary: 'Minggu ini Anda telah menyelesaikan 1 dari 2 tugas dengan 1.5 jam waktu fokus terjadwal. Terdapat 1 tugas tertunda yang dapat dijadwalkan ulang. Waktu paling optimal Anda adalah pada sesi pagi.',
        best_time_window: 'pagi',
        reflection_question: 'Bagaimana ritme belajarmu minggu ini, dan apa satu hal yang ingin kamu sesuaikan untuk menjaga fokus minggu depan?',
      },
      provider: 'fallback',
      model: 'template',
      attempts: 0,
      fallbackUsed: true,
    })

    const req = new Request('http://localhost:3000/api/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart: '2026-10-11',
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.meta.fallbackUsed).toBe(true)
    expect(json.reflection.summary).toContain('Minggu ini Anda telah menyelesaikan 1 dari 2 tugas')
  })
})
