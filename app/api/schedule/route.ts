import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth'
import { createServerClient } from '@/lib/supabase/server'
import { schedule } from '@/lib/scheduler'
import type { FixedEvent, Profile, ScheduleBlock, Task } from '@/lib/types'

export const maxDuration = 10

export async function POST(req: Request) {
  const { user, response } = await getAuthenticatedUser()
  if (response || !user) {
    return response ?? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServerClient()

  try {
    const body = (await req.json().catch(() => ({}))) as {
      weekStart?: string
    }

    const today = new Date()
    const currentDay = today.getDay()
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay
    const monday = new Date(today)
    monday.setDate(today.getDate() + diffToMonday)
    monday.setHours(0, 0, 0, 0)

    const weekStart = body.weekStart ? new Date(body.weekStart) : monday

    const [
      { data: tasksData },
      { data: fixedData },
      { data: blocksData },
      { data: profileData },
    ] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('fixed_events').select('*').eq('user_id', user.id),
      supabase.from('schedule_blocks').select('*').eq('user_id', user.id),
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    ])

    const tasks = (tasksData as Task[]) ?? []
    const fixedEvents = (fixedData as FixedEvent[]) ?? []
    const existingBlocks = (blocksData as ScheduleBlock[]) ?? []
    const profile = profileData as Profile | null

    const activeHours = {
      start: profile?.jam_aktif_mulai ? profile.jam_aktif_mulai.substring(0, 5) : '07:00',
      end: profile?.jam_aktif_selesai ? profile.jam_aktif_selesai.substring(0, 5) : '22:00',
    }

    const scheduleResult = schedule({
      tasks,
      fixedEvents,
      existingBlocks,
      weekStart,
      activeHours,
      now: new Date(),
    })

    const preservedBlocks = existingBlocks.filter(
      (b) => b.dikunci || b.dimodifikasi_manusia
    )
    const preservedIds = new Set(preservedBlocks.map((b) => b.id))

    const blocksToDelete = existingBlocks.filter((b) => !preservedIds.has(b.id))
    if (blocksToDelete.length > 0) {
      const deleteIds = blocksToDelete.map((b) => b.id)
      await supabase.from('schedule_blocks').delete().in('id', deleteIds)
    }

    const newBlocksToInsert = scheduleResult.blocks
      .filter((b) => !preservedIds.has(b.id))
      .map((b) => ({
        user_id: user.id,
        task_id: b.task_id,
        mulai: b.mulai,
        selesai: b.selesai,
        dikunci: b.dikunci,
        dimodifikasi_manusia: b.dimodifikasi_manusia,
        alasan_ai: b.alasan_ai,
      }))

    let savedBlocks = preservedBlocks
    if (newBlocksToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('schedule_blocks')
        .insert(newBlocksToInsert)
        .select()

      if (insertError) {
        throw insertError
      }

      if (inserted) {
        savedBlocks = [...preservedBlocks, ...(inserted as ScheduleBlock[])]
      }
    }

    savedBlocks.sort(
      (a, b) => new Date(a.mulai).getTime() - new Date(b.mulai).getTime()
    )

    return NextResponse.json({
      blocks: savedBlocks,
      unplaced: scheduleResult.unplaced,
      totalRequiredMinutes: scheduleResult.totalRequiredMinutes,
      totalAvailableMinutes: scheduleResult.totalAvailableMinutes,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal menyusun jadwal'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
