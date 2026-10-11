import { describe, expect, it } from 'vitest'
import { taskFormSchema } from './tasks'

describe('Task Validation Schema', () => {
  it('accepts valid task data', () => {
    const valid = taskFormSchema.safeParse({
      judul: 'Tugas Algoritma dan Pemrograman',
      durasi_menit: 120,
      kesulitan: 4,
      kepentingan: 5,
      can_split: true,
      sesi_disarankan: 2,
      status: 'todo',
    })
    expect(valid.success).toBe(true)
  })

  it('rejects empty title', () => {
    const invalid = taskFormSchema.safeParse({
      judul: '   ',
      durasi_menit: 60,
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe('Judul tugas wajib diisi')
    }
  })

  it('rejects invalid difficulty scale', () => {
    const invalid = taskFormSchema.safeParse({
      judul: 'Praktikum',
      kesulitan: 6,
    })
    expect(invalid.success).toBe(false)
  })

  it('rejects duration shorter than 15 minutes', () => {
    const invalid = taskFormSchema.safeParse({
      judul: 'Kuis Singkat',
      durasi_menit: 5,
    })
    expect(invalid.success).toBe(false)
  })
})
