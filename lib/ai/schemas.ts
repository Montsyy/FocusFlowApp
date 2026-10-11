import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string(),
  estimatedMinutes: z.number().optional(),
})

export type ParsedTask = z.infer<typeof taskSchema>
