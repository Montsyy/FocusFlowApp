export interface ParsedTaskResult {
  title: string
  deadline: string | null
  estimated_minutes: number
  difficulty: number
  importance: number
  can_split: boolean
  suggested_sessions: number
}

export interface ExplainBlockContext {
  taskTitle?: string
  scheduledTime?: string
  energyWindow?: string
  userEnergy?: number
}

export interface ExplainBlockResult {
  reason: string
}

export interface ReflectWeekContext {
  completedTasks?: number
  totalTasks?: number
  energyAverage?: number
  totalHours?: number
}

export interface ReflectWeekResult {
  summary: string
  best_time_window: string
  reflection_question: string
}

export function parseTaskFallback(input: string): ParsedTaskResult {
  return {
    title: input.trim() || 'Tugas Baru',
    deadline: null,
    estimated_minutes: 60,
    difficulty: 3,
    importance: 3,
    can_split: false,
    suggested_sessions: 1,
  }
}

export function explainBlockFallback(context: ExplainBlockContext): ExplainBlockResult {
  const title = context.taskTitle || 'Tugas'
  const window = context.energyWindow || 'waktu produktif'
  return {
    reason: `Sesi "${title}" ditempatkan secara otomatis pada jendela ${window} untuk menjaga fokus tanpa bentrok jadwal tetap.`,
  }
}

export function reflectWeekFallback(context: ReflectWeekContext): ReflectWeekResult {
  const completed = context.completedTasks ?? 0
  const total = context.totalTasks ?? 0
  const hours = context.totalHours ?? 0

  return {
    summary: `Minggu ini Anda telah menyelesaikan ${completed} dari ${total} tugas (${hours} jam waktu fokus). Kerja bagus untuk menjaga kemajuan belajarmu!`,
    best_time_window: 'pagi',
    reflection_question:
      'Bagaimana perasaanmu tentang keseimbangan antara waktu belajar dan istirahat pada minggu ini?',
  }
}
