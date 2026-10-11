import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from './auth'

describe('Auth Validation Schemas', () => {
  it('accepts valid login data', () => {
    const valid = loginSchema.safeParse({
      email: 'mahasiswa@kampus.ac.id',
      password: 'password123',
    })
    expect(valid.success).toBe(true)
  })

  it('rejects invalid email format in login', () => {
    const invalid = loginSchema.safeParse({
      email: 'bukan-email',
      password: 'password123',
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe('Format email tidak valid')
    }
  })

  it('rejects short password less than 8 characters', () => {
    const invalid = loginSchema.safeParse({
      email: 'mahasiswa@kampus.ac.id',
      password: '12345',
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe('Kata sandi minimal 8 karakter')
    }
  })

  it('accepts valid register data', () => {
    const valid = registerSchema.safeParse({
      nama: 'Budi Pratama',
      email: 'budi@kampus.ac.id',
      password: 'password123',
    })
    expect(valid.success).toBe(true)
  })

  it('rejects name shorter than 2 characters in register', () => {
    const invalid = registerSchema.safeParse({
      nama: 'A',
      email: 'budi@kampus.ac.id',
      password: 'password123',
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues[0]?.message).toBe('Nama minimal 2 karakter')
    }
  })
})
