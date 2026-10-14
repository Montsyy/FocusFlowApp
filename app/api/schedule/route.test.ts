import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'
import type { User, SupabaseClient } from '@supabase/supabase-js'
import { POST } from './route'
import * as authModule from '@/lib/supabase/auth'
import * as serverModule from '@/lib/supabase/server'
import * as aiModule from '@/lib/ai'
import type { FixedEvent, Profile, ScheduleBlock, Task, EnergyLog } from '@/lib/types'

vi.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

describe('POST /api/schedule', () => {
  const mockUserId = 'user-test-uuid'

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      user_id: mockUserId,
      judul: 'Belajar Kalkulus Lanjut',
      deadline: '2026-10-18T23:59:59.000Z',
      durasi_menit: 90,
      kesulitan: 4,
      kepentingan: 5,
      can_split: false,
      sesi_disarankan: 1,
      status: 'todo',
      created_at: '2026-10-14T10:00:00.000Z',
    },
    {
      id: 'task-2',
      user_id: mockUserId,
      judul: 'Tugas Praktikum Algoritma',
      deadline: '2026-10-18T23:59:59.000Z',
      durasi_menit: 60,
      kesulitan: 3,
      kepentingan: 4,
      can_split: false,
      sesi_disarankan: 1,
      status: 'todo',
      created_at: '2026-10-14T11:00:00.000Z',
    },
  ]

  const mockFixedEvents: FixedEvent[] = [
    {
      id: 'fixed-1',
      user_id: mockUserId,
      judul: 'Kuliah Sistem Operasi',
      hari: 1, // Senin
      jam_mulai: '08:00:00',
      jam_selesai: '10:00:00',
    },
  ]

  const mockProfile: Profile = {
    id: mockUserId,
    nama: 'Budi Santoso',
    jam_aktif_mulai: '07:00:00',
    jam_aktif_selesai: '22:00:00',
  }

  const mockTodayEnergy: EnergyLog = {
    id: 'energy-today',
    user_id: mockUserId,
    tanggal: new Date().toISOString().split('T')[0],
    pagi: 5,
    siang: 3,
    malam: 2,
    mood: 'semangat',
  }

  let inMemoryBlocks: ScheduleBlock[] = []
  let deletedBlockIds: string[] = []
  let insertedBlockPayloads: Partial<ScheduleBlock>[] = []

  beforeEach(() => {
    vi.restoreAllMocks()
    inMemoryBlocks = []
    deletedBlockIds = []
    insertedBlockPayloads = []

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
            }),
          }
        }

        if (table === 'fixed_events') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockFixedEvents, error: null }),
            }),
          }
        }

        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
              }),
            }),
          }
        }

        if (table === 'energy_logs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: mockTodayEnergy, error: null }),
                }),
              }),
            }),
          }
        }

        if (table === 'schedule_blocks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: inMemoryBlocks, error: null }),
            }),
            delete: vi.fn().mockReturnValue({
              in: vi.fn().mockImplementation((col: string, ids: string[]) => {
                deletedBlockIds.push(...ids)
                inMemoryBlocks = inMemoryBlocks.filter((b) => !ids.includes(b.id))
                return Promise.resolve({ data: null, error: null })
              }),
            }),
            insert: vi.fn().mockImplementation((payloads: Partial<ScheduleBlock>[]) => {
              insertedBlockPayloads.push(...payloads)
              const created = payloads.map((p, idx) => ({
                id: `inserted-block-${idx + 1}`,
                user_id: mockUserId,
                task_id: p.task_id ?? null,
                mulai: p.mulai!,
                selesai: p.selesai!,
                dikunci: p.dikunci ?? false,
                dimodifikasi_manusia: p.dimodifikasi_manusia ?? false,
                alasan_ai: p.alasan_ai ?? null,
              }))
              inMemoryBlocks.push(...created)
              return {
                select: vi.fn().mockResolvedValue({ data: created, error: null }),
              }
            }),
            update: vi.fn().mockImplementation((payload: Partial<ScheduleBlock>) => ({
              eq: vi.fn().mockImplementation((col: string, id: string) => {
                inMemoryBlocks = inMemoryBlocks.map((b) =>
                  b.id === id ? { ...b, ...payload } : b
                )
                return Promise.resolve({ data: null, error: null })
              }),
            })),
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

    vi.spyOn(serverModule, 'createServerClient').mockResolvedValue(mockClient)
  })

  it('returns 401 Unauthorized when user is unauthenticated', async () => {
    const mockClient = {} as unknown as SupabaseClient
    vi.spyOn(authModule, 'getAuthenticatedUser').mockResolvedValueOnce({
      user: null,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      supabase: mockClient,
    })

    const req = new Request('http://localhost:3000/api/schedule', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('places and saves blocks first, fills alasan_ai with failover router, and returns meta', async () => {
    vi.spyOn(aiModule, 'batchExplainBlocks').mockImplementation(async (items) => ({
      data: {
        reasons: items.map((item) => ({
          id: item.id,
          reason: item.taskTitle.includes('Kalkulus')
            ? 'Ditempatkan di pagi hari karena energi prima dan tingkat kesulitan tinggi.'
            : 'Ditempatkan setelah kuliah untuk menjaga momentum fokus belajar.',
        })),
      },
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      attempts: 1,
      fallbackUsed: false,
    }))

    const req = new Request('http://localhost:3000/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: '2026-10-11T00:00:00.000Z' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.blocks).toBeDefined()
    expect(json.blocks.length).toBeGreaterThan(0)
    expect(json.capacity).toBeDefined()
    expect(json.capacity.totalRequiredMinutes).toBeGreaterThan(0)
    expect(json.capacity.totalAvailableMinutes).toBeGreaterThan(0)
    expect(typeof json.capacity.percentage).toBe('number')
    expect(json.unplaced).toEqual([])

    // Check meta
    expect(json.meta).toEqual({
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      fallbackUsed: false,
    })

    // Verify AI explanation is stored in the block
    const blockWithAi = json.blocks.find((b: ScheduleBlock) => b.task_id === 'task-1')
    expect(blockWithAi).toBeDefined()
    expect(blockWithAi.alasan_ai).toContain('Ditempatkan di pagi hari')
  })

  it('gracefully falls back to template reasons and returns meta when AI fails', async () => {
    vi.spyOn(aiModule, 'batchExplainBlocks').mockRejectedValueOnce(
      new Error('Gemini API quota exceeded')
    )

    const req = new Request('http://localhost:3000/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: '2026-10-11T00:00:00.000Z' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.blocks.length).toBeGreaterThan(0)

    expect(json.meta).toEqual({
      provider: 'fallback',
      model: 'template',
      fallbackUsed: true,
    })

    for (const block of json.blocks) {
      expect(block.alasan_ai).toBeTruthy()
      expect(typeof block.alasan_ai).toBe('string')
    }
  })

  it('keeps template reasons and marks fallbackUsed when reason generation times out', async () => {
    vi.spyOn(Promise, 'race').mockResolvedValueOnce(null)

    const req = new Request('http://localhost:3000/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: '2026-10-11T00:00:00.000Z' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.blocks.length).toBeGreaterThan(0)
    expect(json.meta).toEqual({
      provider: 'fallback',
      model: 'template',
      fallbackUsed: true,
    })

    for (const block of json.blocks) {
      expect(block.alasan_ai).toBeTruthy()
    }
  })

  it('is idempotent: running twice with the same data replaces non-preserved blocks without duplication', async () => {
    vi.spyOn(aiModule, 'batchExplainBlocks').mockImplementation(async (items) => ({
      data: {
        reasons: items.map((item) => ({ id: item.id, reason: 'Alasan belajar fokus' })),
      },
      provider: 'gemini',
      model: 'gemini-2.5-flash',
      attempts: 1,
      fallbackUsed: false,
    }))

    const req1 = new Request('http://localhost:3000/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: '2026-10-11T00:00:00.000Z' }),
    })
    const res1 = await POST(req1)
    const json1 = await res1.json()
    const countAfterFirstRun = json1.blocks.length

    const req2 = new Request('http://localhost:3000/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: '2026-10-11T00:00:00.000Z' }),
    })
    const res2 = await POST(req2)
    const json2 = await res2.json()

    expect(json2.blocks.length).toBe(countAfterFirstRun)
    expect(deletedBlockIds.length).toBeGreaterThan(0)
    expect(json2.meta.provider).toBe('gemini')
  })

  it('preserves locked or human-modified blocks and never deletes them', async () => {
    const lockedBlock: ScheduleBlock = {
      id: 'locked-block-1',
      user_id: mockUserId,
      task_id: 'task-1',
      mulai: '2026-10-12T14:00:00.000Z',
      selesai: '2026-10-12T15:30:00.000Z',
      dikunci: true,
      dimodifikasi_manusia: false,
      alasan_ai: 'Dikunci oleh pengguna secara manual',
    }
    const humanBlock: ScheduleBlock = {
      id: 'human-block-2',
      user_id: mockUserId,
      task_id: 'task-2',
      mulai: '2026-10-13T09:00:00.000Z',
      selesai: '2026-10-13T10:30:00.000Z',
      dikunci: false,
      dimodifikasi_manusia: true,
      alasan_ai: 'Diubah oleh pengguna secara manual',
    }
    inMemoryBlocks = [lockedBlock, humanBlock]

    const req = new Request('http://localhost:3000/api/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: '2026-10-11T00:00:00.000Z' }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(deletedBlockIds).not.toContain('locked-block-1')
    expect(deletedBlockIds).not.toContain('human-block-2')
    const preservedLocked = json.blocks.find((b: ScheduleBlock) => b.id === 'locked-block-1')
    expect(preservedLocked).toBeDefined()
    expect(preservedLocked.dikunci).toBe(true)
    const preservedHuman = json.blocks.find((b: ScheduleBlock) => b.id === 'human-block-2')
    expect(preservedHuman).toBeDefined()
    expect(preservedHuman.dimodifikasi_manusia).toBe(true)
  })
})
