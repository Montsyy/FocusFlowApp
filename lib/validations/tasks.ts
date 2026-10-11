import { z } from 'zod'

export const taskFormSchema = z.object({
  judul: z.string().trim().min(1, 'Judul tugas wajib diisi'),
  deadline: z.string().nullable().optional(),
  durasi_menit: z.coerce
    .number()
    .int('Durasi harus berupa angka bulat')
    .min(15, 'Durasi minimal 15 menit')
    .max(1440, 'Durasi maksimal 1440 menit (24 jam)')
    .default(60),
  kesulitan: z.coerce
    .number()
    .int()
    .min(1, 'Skala kesulitan minimal 1')
    .max(5, 'Skala kesulitan maksimal 5')
    .default(3),
  kepentingan: z.coerce
    .number()
    .int()
    .min(1, 'Skala kepentingan minimal 1')
    .max(5, 'Skala kepentingan maksimal 5')
    .default(3),
  can_split: z.boolean().default(false),
  sesi_disarankan: z.coerce
    .number()
    .int()
    .min(1, 'Jumlah sesi minimal 1')
    .max(10, 'Jumlah sesi maksimal 10')
    .default(1),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
})

export type TaskFormInput = z.infer<typeof taskFormSchema>
