import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { RealityCheck } from './RealityCheck'
import type { UnplacedTask } from '@/lib/scheduler'
import type { Task } from '@/lib/types'

function createSampleTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    user_id: 'user-1',
    judul: 'Tugas Algoritma',
    deadline: '2026-10-18T23:59:59.000Z',
    durasi_menit: 90,
    kesulitan: 4,
    kepentingan: 5,
    can_split: false,
    sesi_disarankan: 1,
    status: 'todo',
    created_at: '2026-10-14T10:00:00.000Z',
    ...overrides,
  }
}

describe('RealityCheck Component', () => {
  it('renders an empty bar (0% width) when totalEstimatedMinutes is 0', () => {
    const html = renderToString(<RealityCheck totalEstimatedMinutes={0} />)
    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('0j / 28j kapasitas')
    expect(html).toContain('style="width:0%"')
    expect(textContent).toContain('Kapasitas aman')
  })

  it('renders safe capacity message when required is within available capacity', () => {
    const html = renderToString(
      <RealityCheck totalRequiredMinutes={600} totalAvailableMinutes={1680} />
    )
    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('10j / 28j kapasitas')
    expect(textContent).toContain('Kapasitas aman: Rencana mingguan Anda realistis')
    expect(textContent).not.toContain('Peringatan: Beban Melebihi Kapasitas')
  })

  it('shows overloaded banner, numbers, and diff when totalRequiredMinutes exceeds totalAvailableMinutes', () => {
    const html = renderToString(
      <RealityCheck totalRequiredMinutes={2100} totalAvailableMinutes={1680} />
    )
    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('35j / 28j kapasitas (+7j)')
    expect(textContent).toContain('Peringatan: Beban Melebihi Kapasitas')
    expect(textContent).toContain('Peringatan: Jadwal hampir penuh! Waktu yang dibutuhkan melebihi jam aktif yang tersedia minggu ini.')
    expect(html).toContain('style="width:100%"')
    expect(textContent).toContain('Hari Ini Kacau')
  })

  it('lists unplaced tasks with reasons and the three actions (Tunda, Pecah tugas, Minta bantuan)', () => {
    const unplaced: UnplacedTask[] = [
      {
        task: createSampleTask({ id: 't-unplaced', judul: 'Proyek Skripsi' }),
        reason: 'tidak muat',
      },
    ]

    const html = renderToString(<RealityCheck unplacedTasks={unplaced} />)
    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('Perlu Keputusan Manusia')
    expect(textContent).toContain('Proyek Skripsi')
    expect(textContent).toContain('Slot Waktu Penuh')
    expect(textContent).toContain('Tunda')
    expect(textContent).toContain('Pecah tugas')
    expect(textContent).toContain('Minta bantuan')
  })

  it('renders compact variant for calendar page with capacity numbers and Hari Ini Kacau button', () => {
    const html = renderToString(
      <RealityCheck
        variant="compact"
        totalRequiredMinutes={900}
        totalAvailableMinutes={1800}
      />
    )
    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('Kapasitas:')
    expect(textContent).toContain('15j / 30j kapasitas (50%)')
    expect(textContent).toContain('Hari Ini Kacau')
  })

  it('renders compact variant with unplaced indicator when unplaced tasks exist', () => {
    const unplaced: UnplacedTask[] = [
      {
        task: createSampleTask({ id: 't-1' }),
        reason: 'tidak muat',
      },
    ]

    const html = renderToString(
      <RealityCheck
        variant="compact"
        unplacedTasks={unplaced}
        onOpenUnplacedDrawer={() => {}}
      />
    )
    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('1 Perlu Keputusan')
  })
})

