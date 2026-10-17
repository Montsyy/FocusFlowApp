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
  missedTasks?: number
  completionRate?: number
  energyAverage?: number
  totalHours?: number
  mostProductiveTimeWindow?: string
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

export interface BatchExplainItem {
  id: string
  taskTitle: string
  scheduledTime: string
  energyWindow: string
  userEnergy?: number
  difficulty?: number
  importance?: number
}

export interface BatchExplainResult {
  reasons: {
    id: string
    reason: string
  }[]
}

export function batchExplainFallback(items: BatchExplainItem[]): BatchExplainResult {
  return {
    reasons: items.map((item) => ({
      id: item.id,
      reason: explainBlockFallback({
        taskTitle: item.taskTitle,
        scheduledTime: item.scheduledTime,
        energyWindow: item.energyWindow,
        userEnergy: item.userEnergy,
      }).reason,
    })),
  }
}

export function reflectWeekFallback(context: ReflectWeekContext): ReflectWeekResult {
  const completed = context.completedTasks ?? 0
  const total = context.totalTasks ?? 0
  const missed = context.missedTasks ?? 0
  const hours = context.totalHours ?? 0
  const window = context.mostProductiveTimeWindow || 'pagi'

  const missedNote =
    missed > 0
      ? ` Terdapat ${missed} tugas tertunda yang dapat dijadwalkan ulang.`
      : ' Seluruh target tugas mingguan tercapai dengan baik!'

  return {
    summary: `Minggu ini Anda telah menyelesaikan ${completed} dari ${total} tugas dengan ${hours} jam waktu fokus terjadwal.${missedNote} Waktu paling optimal Anda adalah pada sesi ${window}.`,
    best_time_window: window,
    reflection_question:
      'Bagaimana ritme belajarmu minggu ini, dan apa satu hal yang ingin kamu sesuaikan untuk menjaga fokus minggu depan?',
  }
}
