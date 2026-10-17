import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth'
import { createServerClient } from '@/lib/supabase/server'
import { schedule } from '@/lib/scheduler'
import { getEnergyWindow, type EnergyLevels } from '@/lib/scheduler/slots'
import {
  batchExplainBlocks,
  explainBlockFallback,
  type BatchExplainItem,
} from '@/lib/ai'
import type {
  EnergyLog,
  FixedEvent,
  Profile,
  ScheduleBlock,
  Task,
} from '@/lib/types'

export const maxDuration = 15

export async function POST(req: Request) {
  const { user, response } = await getAuthenticatedUser()
  if (response || !user) {
    return response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerClient()

  try {
    const body = (await req.json().catch(() => ({}))) as {
      weekStart?: string
      mode?: 'replan_today' | 'regular'
      replanToday?: boolean
      now?: string
    }

    const isReplanToday = Boolean(body.replanToday || body.mode === 'replan_today')
    const nowDate = body.now ? new Date(body.now) : new Date()

    const today = new Date(nowDate)
    const currentDay = today.getDay()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - currentDay)
    sunday.setHours(0, 0, 0, 0)

    const weekStart = body.weekStart ? new Date(body.weekStart) : sunday
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)

    const todayStr = nowDate.toISOString().split('T')[0]

    const [
      { data: tasksData },
      { data: fixedData },
      { data: blocksData },
      { data: energyData },
      { data: profileData },
    ] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('fixed_events').select('*').eq('user_id', user.id),
      supabase.from('schedule_blocks').select('*').eq('user_id', user.id),
      supabase
        .from('energy_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('tanggal', todayStr)
        .maybeSingle(),
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    ])

    const tasks = (tasksData as Task[]) ?? []
    const fixedEvents = (fixedData as FixedEvent[]) ?? []
    const existingBlocks = (blocksData as ScheduleBlock[]) ?? []
    const energyLog = energyData as EnergyLog | null
    const profile = profileData as Profile | null

    const energyLevels: EnergyLevels = {
      pagi: energyLog?.pagi ?? 3,
      siang: energyLog?.siang ?? 3,
      malam: energyLog?.malam ?? 3,
    }

    const activeHours = {
      start: profile?.jam_aktif_mulai ? profile.jam_aktif_mulai.substring(0, 5) : '07:00',
      end: profile?.jam_aktif_selesai ? profile.jam_aktif_selesai.substring(0, 5) : '22:00',
    }

    const scheduleResult = schedule({
      tasks,
      fixedEvents,
      existingBlocks,
      energy: energyLevels,
      weekStart,
      activeHours,
      now: nowDate,
      replanTodayOnly: isReplanToday,
    })

    const preservedBlocks = existingBlocks.filter((b) => {
      if (b.dikunci || b.dimodifikasi_manusia) return true
      if (isReplanToday) {
        const bStart = new Date(b.mulai)
        if (bStart.toDateString() !== nowDate.toDateString()) {
          return true
        }
        if (bStart.getTime() < nowDate.getTime()) {
          return true
        }
      }
      return false
    })
    const preservedIds = new Set(preservedBlocks.map((b) => b.id))

    const blocksToDelete = existingBlocks.filter((b) => {
      if (preservedIds.has(b.id)) return false
      const t = new Date(b.mulai).getTime()
      if (isReplanToday) {
        const bStart = new Date(b.mulai)
        if (bStart.toDateString() !== nowDate.toDateString()) return false
        return bStart.getTime() >= nowDate.getTime()
      }
      return t >= weekStart.getTime() && t < weekEnd.getTime()
    })

    if (blocksToDelete.length > 0) {
      const deleteIds = blocksToDelete.map((b) => b.id)
      await supabase.from('schedule_blocks').delete().in('id', deleteIds)
    }

    const newBlocks = scheduleResult.blocks.filter((b) => !preservedIds.has(b.id))
    const taskMap = new Map(tasks.map((t) => [t.id, t]))
    let savedBlocks = preservedBlocks
    let meta = {
      provider: 'none',
      model: 'none',
      fallbackUsed: false,
    }

    if (newBlocks.length > 0) {
      const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

      const templateBlocksToInsert = newBlocks.map((b) => {
        const task = b.task_id ? taskMap.get(b.task_id) : undefined
        const start = new Date(b.mulai)
        const window = getEnergyWindow(start)
        const fallbackReason = explainBlockFallback({
          taskTitle: task?.judul,
          scheduledTime: b.mulai,
          energyWindow: window,
          userEnergy: energyLevels[window],
        }).reason

        return {
          user_id: user.id,
          task_id: b.task_id,
          mulai: b.mulai,
          selesai: b.selesai,
          dikunci: b.dikunci,
          dimodifikasi_manusia: b.dimodifikasi_manusia,
          alasan_ai: b.alasan_ai || fallbackReason,
        }
      })

      const { data: inserted, error: insertError } = await supabase
        .from('schedule_blocks')
        .insert(templateBlocksToInsert)
        .select()

      if (insertError) {
        throw insertError
      }

      let insertedBlocks = (inserted as ScheduleBlock[]) ?? []

      const batchItems: BatchExplainItem[] = insertedBlocks.map((b) => {
        const task = b.task_id ? taskMap.get(b.task_id) : undefined
        const start = new Date(b.mulai)
        const end = new Date(b.selesai)
        const dayName = dayNames[start.getDay()] || ''
        const timeFormatted = `${dayName}, ${start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })}`
        const window = getEnergyWindow(start)

        return {
          id: b.id,
          taskTitle: task?.judul || 'Sesi Belajar',
          scheduledTime: timeFormatted,
          energyWindow: window,
          userEnergy: energyLevels[window],
          difficulty: task?.kesulitan ?? 3,
          importance: task?.kepentingan ?? 3,
        }
      })

      const STRICT_AI_BUDGET_MS = 4000
      const timeoutPromise = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), STRICT_AI_BUDGET_MS)
      )

      try {
        const aiPromise = batchExplainBlocks(batchItems)
        const aiResult = await Promise.race([aiPromise, timeoutPromise])

        if (aiResult) {
          meta = {
            provider: aiResult.provider,
            model: aiResult.model,
            fallbackUsed: aiResult.fallbackUsed,
          }

          if (!aiResult.fallbackUsed && aiResult.data.reasons.length > 0) {
            const reasonMap = new Map(aiResult.data.reasons.map((r) => [r.id, r.reason]))

            const updates = insertedBlocks
              .filter((b) => reasonMap.has(b.id))
              .map((b) => ({
                id: b.id,
                alasan_ai: reasonMap.get(b.id)!,
              }))

            if (updates.length > 0) {
              await Promise.all(
                updates.map((u) =>
                  supabase
                    .from('schedule_blocks')
                    .update({ alasan_ai: u.alasan_ai })
                    .eq('id', u.id)
                )
              )

              insertedBlocks = insertedBlocks.map((b) =>
                reasonMap.has(b.id) ? { ...b, alasan_ai: reasonMap.get(b.id)! } : b
              )
            }
          }
        } else {
          meta = {
            provider: 'fallback',
            model: 'template',
            fallbackUsed: true,
          }
        }
      } catch {
        meta = {
          provider: 'fallback',
          model: 'template',
          fallbackUsed: true,
        }
      }

      savedBlocks = [...preservedBlocks, ...insertedBlocks]
    }

    savedBlocks.sort(
      (a, b) => new Date(a.mulai).getTime() - new Date(b.mulai).getTime()
    )

    const capacity = {
      totalRequiredMinutes: scheduleResult.totalRequiredMinutes,
      totalAvailableMinutes: scheduleResult.totalAvailableMinutes,
      percentage: scheduleResult.totalAvailableMinutes > 0
        ? Math.min(100, Math.round((scheduleResult.totalRequiredMinutes / scheduleResult.totalAvailableMinutes) * 100))
        : 0,
    }

    return NextResponse.json({
      blocks: savedBlocks,
      unplaced: scheduleResult.unplaced,
      capacity,
      totalRequiredMinutes: scheduleResult.totalRequiredMinutes,
      totalAvailableMinutes: scheduleResult.totalAvailableMinutes,
      meta,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menyusun jadwal'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
