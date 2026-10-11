import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { StatCards } from './StatCards'
import type { Task } from '@/lib/types'

function makeMockTask(id: string, status: string): Task {
  return {
    id,
    user_id: 'user-1',
    judul: `Task ${id}`,
    deadline: null,
    durasi_menit: 60,
    kesulitan: 3,
    kepentingan: 3,
    can_split: false,
    sesi_disarankan: 1,
    status,
    created_at: new Date().toISOString(),
  }
}

describe('StatCards Component', () => {
  it('renders 0% when there are no tasks', () => {
    const html = renderToString(<StatCards tasks={[]} />)
    const text = html.replace(/<!--.*?-->/g, '')
    expect(text).toContain('0%')
    expect(text).toContain('0 / 0 selesai')
    expect(text).toContain('Tingkat Penyelesaian')
    expect(html).toContain('style="width:0%"')
  })

  it('renders 50% when half tasks are selesai/done', () => {
    const tasks = [
      makeMockTask('1', 'done'),
      makeMockTask('2', 'todo'),
    ]
    const html = renderToString(<StatCards tasks={tasks} />)
    const text = html.replace(/<!--.*?-->/g, '')
    expect(text).toContain('50%')
    expect(text).toContain('1 / 2 selesai')
    expect(html).toContain('style="width:50%"')
  })

  it('renders 100% when all tasks are completed', () => {
    const tasks = [
      makeMockTask('1', 'done'),
      makeMockTask('2', 'selesai'),
    ]
    const html = renderToString(<StatCards tasks={tasks} />)
    const text = html.replace(/<!--.*?-->/g, '')
    expect(text).toContain('100%')
    expect(text).toContain('2 / 2 selesai')
    expect(html).toContain('style="width:100%"')
    expect(text).toContain('Luar biasa! Semua tugas minggu ini telah diselesaikan.')
  })
})
