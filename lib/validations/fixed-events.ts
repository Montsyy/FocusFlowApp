import { z } from 'zod'

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/

export const fixedEventFormSchema = z
  .object({
    judul: z.string().trim().min(1, 'Judul jadwal tetap wajib diisi'),
    hari: z.coerce.number().int().min(0, 'Hari minimal 0 (Minggu)').max(6, 'Hari maksimal 6 (Sabtu)'),
    jam_mulai: z.string().regex(timeRegex, 'Format jam mulai harus JJ:MM'),
    jam_selesai: z.string().regex(timeRegex, 'Format jam selesai harus JJ:MM'),
  })
  .refine(
    (data) => {
      const [startH = 0, startM = 0] = data.jam_mulai.split(':').map(Number)
      const [endH = 0, endM = 0] = data.jam_selesai.split(':').map(Number)
      const startTotal = startH * 60 + startM
      const endTotal = endH * 60 + endM
      return endTotal > startTotal
    },
    {
      message: 'Jam selesai harus lebih akhir dari jam mulai',
      path: ['jam_selesai'],
    }
  )

export type FixedEventFormInput = z.infer<typeof fixedEventFormSchema>
