import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
})

export const registerSchema = z.object({
  nama: z.string().trim().min(2, 'Nama minimal 2 karakter'),
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
