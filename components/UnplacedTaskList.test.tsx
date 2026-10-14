import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { UnplacedTaskList } from './UnplacedTaskList'
import type { UnplacedTask } from '@/lib/scheduler'

describe('UnplacedTaskList Component', () => {
  it('renders nothing when unplaced array is empty', () => {
    const html = renderToString(<UnplacedTaskList unplaced={[]} />)
    expect(html).toBe('')
  })

  it('renders list of unplaced tasks with formatted reasons', () => {
    const unplaced: UnplacedTask[] = [
      {
        task: {
          id: 'task-1',
          user_id: 'user-1',
          judul: 'Tugas Kalkulus Super Panjang',
          durasi_menit: 420,
          kesulitan: 5,
          kepentingan: 5,
          can_split: false,
          sesi_disarankan: 1,
          status: 'todo',
          deadline: null,
          created_at: new Date().toISOString(),
        },
        reason: 'melebihi batas harian',
      },
      {
        task: {
          id: 'task-2',
          user_id: 'user-1',
          judul: 'Tugas Deadline Lewat',
          durasi_menit: 60,
          kesulitan: 3,
          kepentingan: 3,
          can_split: false,
          sesi_disarankan: 1,
          status: 'todo',
          deadline: '2020-01-01',
          created_at: new Date().toISOString(),
        },
        reason: 'melewati deadline',
      },
    ]

    const html = renderToString(<UnplacedTaskList unplaced={unplaced} />)
    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('Tugas Belum Terjadwal (2)')
    expect(textContent).toContain('Tugas Kalkulus Super Panjang')
    expect(textContent).toContain('Batas Harian (6j)')
    expect(textContent).toContain('Tugas Deadline Lewat')
    expect(textContent).toContain('Melewati Deadline')
  })
})
