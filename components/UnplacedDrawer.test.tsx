import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { UnplacedDrawer } from './UnplacedDrawer'
import type { UnplacedTask } from '@/lib/scheduler'
import type { Task } from '@/lib/types'

function createSampleTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-drawer-1',
    user_id: 'user-1',
    judul: 'Laporan Praktikum Fisika',
    deadline: '2026-10-18T23:59:59.000Z',
    durasi_menit: 120,
    kesulitan: 3,
    kepentingan: 4,
    can_split: false,
    sesi_disarankan: 1,
    status: 'todo',
    created_at: '2026-10-14T10:00:00.000Z',
    ...overrides,
  }
}

describe('UnplacedDrawer Component', () => {
  it('renders nothing when isOpen is false', () => {
    const html = renderToString(
      <UnplacedDrawer
        isOpen={false}
        onClose={vi.fn()}
        unplacedTasks={[]}
      />
    )
    expect(html).toBe('')
  })

  it('renders drawer header, unplaced tasks with reasons, and action buttons when open', () => {
    const unplaced: UnplacedTask[] = [
      {
        task: createSampleTask({ id: 't-fisika', judul: 'Laporan Praktikum Fisika' }),
        reason: 'tidak muat',
      },
    ]

    const html = renderToString(
      <UnplacedDrawer
        isOpen={true}
        onClose={vi.fn()}
        unplacedTasks={unplaced}
      />
    )

    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('Perlu Keputusan Manusia')
    expect(textContent).toContain('Laporan Praktikum Fisika')
    expect(textContent).toContain('Slot Waktu Penuh')
    expect(textContent).toContain('Tunda')
    expect(textContent).toContain('Pecah tugas')
    expect(textContent).toContain('Minta bantuan')
    expect(textContent).toContain('Tutup Drawer')
  })
})
