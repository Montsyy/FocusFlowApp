import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { TodayAgenda } from './TodayAgenda'
import type { ScheduleBlock, Task } from '@/lib/types'

describe('TodayAgenda', () => {
  const currentMinggu = '2026-10-11'

  it('renders empty message when no blocks are scheduled for today', () => {
    const html = renderToString(
      <TodayAgenda
        scheduleBlocks={[]}
        tasks={[]}
        currentMinggu={currentMinggu}
      />
    )

    expect(html).toContain('Belum ada blok fokus terjadwal untuk hari ini.')
    expect(html).toContain('Buka kalender penuh')
    expect(html).toContain(`href="/dashboard/kalender?minggu=${currentMinggu}"`)
  })

  it('renders blocks for today with task title, time, and calendar link', () => {
    const today = new Date()
    const start = new Date(today)
    start.setHours(9, 0, 0, 0)
    const end = new Date(today)
    end.setHours(10, 30, 0, 0)

    const task: Task = {
      id: 'task-1',
      user_id: 'user-1',
      judul: 'Tugas Algoritma',
      durasi_menit: 90,
      kesulitan: 3,
      kepentingan: 3,
      deadline: null,
      status: 'todo',
      can_split: false,
      sesi_disarankan: 1,
      created_at: new Date().toISOString(),
    }

    const block: ScheduleBlock = {
      id: 'block-1',
      user_id: 'user-1',
      task_id: 'task-1',
      mulai: start.toISOString(),
      selesai: end.toISOString(),
      dikunci: true,
      dimodifikasi_manusia: true,
      alasan_ai: 'Waktu pagi optimal',
    }

    const html = renderToString(
      <TodayAgenda
        scheduleBlocks={[block]}
        tasks={[task]}
        currentMinggu={currentMinggu}
      />
    )

    expect(html).toContain('Tugas Algoritma')
    expect(html).toContain('🔒')
    expect(html).toContain('Diubah manual')
    expect(html).toContain(
      `href="/dashboard/kalender?minggu=${currentMinggu}&amp;blok=block-1"`
    )
    expect(html).toContain('Selesai')
  })
})
