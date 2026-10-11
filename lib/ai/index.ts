import { z } from 'zod'
import {
  explainBlockFallback,
  parseTaskFallback,
  reflectWeekFallback,
  type ExplainBlockContext,
  type ExplainBlockResult,
  type ParsedTaskResult,
  type ReflectWeekContext,
  type ReflectWeekResult,
} from './fallback'
import { generateStructured, type RouterOptions } from './router'
import type { AiProvider } from './types'

export * from './config'
export * from './cooldown'
export * from './fallback'
export * from './json'
export * from './router'
export * from './types'

export const parseTaskSchema = z.object({
  title: z.string(),
  deadline: z.string().nullable(),
  estimated_minutes: z.number().int().min(15).max(1440),
  difficulty: z.number().int().min(1).max(5),
  importance: z.number().int().min(1).max(5),
  can_split: z.boolean(),
  suggested_sessions: z.number().int().min(1).max(10),
})

export const explainSchema = z.object({
  reason: z.string(),
})

export const reflectSchema = z.object({
  summary: z.string(),
  best_time_window: z.string(),
  reflection_question: z.string(),
})

export interface AiExecutionResult<T> {
  data: T
  provider: AiProvider | 'fallback'
  model: string
  attempts: number
  fallbackUsed: boolean
}

export async function parseTask(
  prompt: string,
  currentDate: Date = new Date(),
  options?: RouterOptions
): Promise<AiExecutionResult<ParsedTaskResult>> {
  const dateStr = currentDate.toISOString()

  const systemInstruction = `Kamu adalah asisten analisis tugas akademis mahasiswa. Ekstrak informasi tugas dari teks berbahasa Indonesia.
Tanggal saat ini sebagai referensi waktu adalah: ${dateStr}.
Aturan:
- title: judul tugas ringkas dan jelas
- deadline: ISO 8601 string jika ada informasi tenggat waktu, atau null jika tidak disebutkan
- estimated_minutes: estimasi waktu pengerjaan dalam menit (15 - 1440, default 60)
- difficulty: tingkat kesulitan 1 (sangat mudah) hingga 5 (sangat sulit), default 3
- importance: tingkat kepentingan 1 (rendah) hingga 5 (sangat krusial), default 3
- can_split: boolean apakah tugas bisa dibagi menjadi beberapa sesi (true jika durasi > 90 menit)
- suggested_sessions: jumlah sesi yang disarankan (1 - 10)`

  try {
    const result = await generateStructured<ParsedTaskResult>(
      {
        system: systemInstruction,
        prompt: `Teks tugas dari mahasiswa: "${prompt}"`,
        schema: parseTaskSchema,
      },
      options
    )

    return {
      data: result.data,
      provider: result.provider,
      model: result.model,
      attempts: result.attempts,
      fallbackUsed: false,
    }
  } catch {
    const fallbackData = parseTaskFallback(prompt)
    return {
      data: fallbackData,
      provider: 'fallback',
      model: 'template',
      attempts: 0,
      fallbackUsed: true,
    }
  }
}

export async function explainBlock(
  context: ExplainBlockContext,
  options?: RouterOptions
): Promise<AiExecutionResult<ExplainBlockResult>> {
  const systemInstruction = `Kamu adalah asisten AI yang menjelaskan alasan penempatan jadwal belajar mahasiswa dalam 1-2 kalimat berbahasa Indonesia yang bersahabat dan memotivasi.`

  const prompt = `Konteks jadwal:
Tugas: "${context.taskTitle || 'Tugas'}"
Waktu: ${context.scheduledTime || 'waktu luang'}
Jendela energi: ${context.energyWindow || 'optimal'}
Level energi pengguna: ${context.userEnergy ?? 3}/5`

  try {
    const result = await generateStructured<ExplainBlockResult>(
      {
        system: systemInstruction,
        prompt,
        schema: explainSchema,
      },
      options
    )

    return {
      data: result.data,
      provider: result.provider,
      model: result.model,
      attempts: result.attempts,
      fallbackUsed: false,
    }
  } catch {
    const fallbackData = explainBlockFallback(context)
    return {
      data: fallbackData,
      provider: 'fallback',
      model: 'template',
      attempts: 0,
      fallbackUsed: true,
    }
  }
}

export async function reflectWeek(
  context: ReflectWeekContext,
  options?: RouterOptions
): Promise<AiExecutionResult<ReflectWeekResult>> {
  const systemInstruction = `Kamu adalah asisten refleksi mingguan mahasiswa. Buat ringkasan pencapaian dan satu pertanyaan refleksi bermakna dalam Bahasa Indonesia.`

  const prompt = `Data mingguan mahasiswa:
Tugas selesai: ${context.completedTasks ?? 0} dari ${context.totalTasks ?? 0}
Rata-rata energi: ${context.energyAverage ?? 3}/5
Total jam fokus: ${context.totalHours ?? 0} jam`

  try {
    const result = await generateStructured<ReflectWeekResult>(
      {
        system: systemInstruction,
        prompt,
        schema: reflectSchema,
      },
      options
    )

    return {
      data: result.data,
      provider: result.provider,
      model: result.model,
      attempts: result.attempts,
      fallbackUsed: false,
    }
  } catch {
    const fallbackData = reflectWeekFallback(context)
    return {
      data: fallbackData,
      provider: 'fallback',
      model: 'template',
      attempts: 0,
      fallbackUsed: true,
    }
  }
}
