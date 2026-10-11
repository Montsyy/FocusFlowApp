import { describe, expect, it } from 'vitest'
import { fixedEventFormSchema } from './fixed-events'

describe('Fixed Event Validation Schema', () => {
  it('accepts valid fixed event data', () => {
    const valid = fixedEventFormSchema.safeParse({
      judul: 'Kuliah Sistem Operasi',
      hari: 1,
      jam_mulai: '08:00',
      jam_selesai: '10:30',
    })
    expect(valid.success).toBe(true)
  })

  it('rejects end time earlier than start time', () => {
    const invalid = fixedEventFormSchema.safeParse({
      judul: 'Praktikum',
      hari: 2,
      jam_mulai: '14:00',
      jam_selesai: '12:00',
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe(
        'Jam selesai harus lebih akhir dari jam mulai'
      )
    }
  })

  it('rejects end time equal to start time', () => {
    const invalid = fixedEventFormSchema.safeParse({
      judul: 'Rapat Organisasi',
      hari: 3,
      jam_mulai: '10:00',
      jam_selesai: '10:00',
    })
    expect(invalid.success).toBe(false)
  })

  it('rejects invalid day index', () => {
    const invalid = fixedEventFormSchema.safeParse({
      judul: 'Olahraga',
      hari: 7,
      jam_mulai: '06:00',
      jam_selesai: '07:00',
    })
    expect(invalid.success).toBe(false)
  })
})
