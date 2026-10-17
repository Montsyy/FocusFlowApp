import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth'
import { reflectWeek } from '@/lib/ai'
import { computeWeeklyStats } from '@/lib/stats/reflection'
import type { Task, ScheduleBlock, EnergyLog } from '@/lib/types'

export const maxDuration = 10

interface ReflectRequestBody {
  weekStart?: string
  now?: string
  tasks?: Task[]
  blocks?: ScheduleBlock[]
  energyLogs?: EnergyLog[]
  completedTasks?: number
  totalTasks?: number
  energyAverage?: number
  totalHours?: number
}

function getWeekStart(input?: string): string {
  if (input) return input.split('T')[0]!
  const today = new Date()
  const day = today.getDay()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - day)
  return sunday.toISOString().split('T')[0]!
}

export async function POST(req: Request) {
  const { user, response, supabase } = await getAuthenticatedUser()
  if (response || !user) {
    return response || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as ReflectRequestBody
    const weekStartStr = getWeekStart(body.weekStart)
    const weekStartDate = new Date(weekStartStr)
    weekStartDate.setHours(0, 0, 0, 0)
    const weekEndDate = new Date(weekStartDate.getTime() + 7 * 24 * 60 * 60 * 1000)

    let tasks = body.tasks
    let blocks = body.blocks
    let energyLogs = body.energyLogs

    if (!tasks || !blocks || !energyLogs) {
      const weekEndStr = new Date(weekEndDate.getTime() - 1000).toISOString().split('T')[0]!

      const [tasksRes, blocksRes, energyRes] = await Promise.all([
        tasks ? Promise.resolve({ data: tasks, error: null }) : supabase.from('tasks').select('*').eq('user_id', user.id),
        blocks
          ? Promise.resolve({ data: blocks, error: null })
          : supabase
              .from('schedule_blocks')
              .select('*')
              .eq('user_id', user.id)
              .gte('mulai', weekStartDate.toISOString())
              .lt('mulai', weekEndDate.toISOString()),
        energyLogs
          ? Promise.resolve({ data: energyLogs, error: null })
          : supabase
              .from('energy_logs')
              .select('*')
              .eq('user_id', user.id)
              .gte('tanggal', weekStartStr)
              .lte('tanggal', weekEndStr),
      ])

      tasks = (tasksRes.data as Task[]) ?? []
      blocks = (blocksRes.data as ScheduleBlock[]) ?? []
      energyLogs = (energyRes.data as EnergyLog[]) ?? []
    }

    const stats = computeWeeklyStats({
      tasks,
      blocks,
      energyLogs,
      weekStart: weekStartStr,
      now: body.now,
    })

    const result = await reflectWeek({
      completedTasks: body.completedTasks ?? stats.completedTasks,
      totalTasks: body.totalTasks ?? stats.totalTasks,
      missedTasks: stats.missedTasks,
      completionRate: stats.completionRate,
      energyAverage: body.energyAverage ?? stats.energyAverage,
      totalHours: body.totalHours ?? stats.totalFocusHours,
      mostProductiveTimeWindow: stats.mostProductiveTimeWindow,
    })

    return NextResponse.json({
      stats,
      reflection: result.data,
      data: result.data,
      meta: {
        provider: result.provider,
        model: result.model,
        fallbackUsed: result.fallbackUsed,
        attempts: result.attempts,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menghasilkan refleksi'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
