import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import RefleksiShell from './RefleksiShell'
import type { WeeklyStats } from '@/lib/stats/reflection'
import type { Reflection } from '@/lib/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: () => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: {} }),
    }),
  }),
}))

describe('RefleksiShell Component', () => {
  const sampleStats: WeeklyStats = {
    totalTasks: 4,
    completedTasks: 3,
    missedTasks: 1,
    completionRate: 75,
    totalFocusMinutes: 180,
    totalFocusHours: 3.0,
    mostProductiveTimeWindow: 'pagi',
    energyAverage: 4.2,
  }

  const sampleReflection: Reflection = {
    id: 'ref-1',
    user_id: 'u1',
    minggu: '2026-10-11',
    ringkasan_ai: 'Minggu produktif dengan 3 tugas tuntas dan energi prima di pagi hari.',
    pertanyaan: 'Apa strategi terbaik yang ingin kamu pertahankan untuk minggu depan?',
    jawaban_pengguna: 'Menjaga konsistensi bangun pagi dan langsung mengerjakan tugas terberat.',
  }

  it('renders weekly reflection stats and AI summary accurately', () => {
    const html = renderToString(
      <RefleksiShell
        userNama="Budi"
        userEmail="budi@example.com"
        initialWeekStart="2026-10-11"
        initialStats={sampleStats}
        initialReflection={sampleReflection}
        initialHistory={[sampleReflection]}
        initialTasks={[]}
        initialBlocks={[]}
        initialEnergyLogs={[]}
      />
    )

    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('Refleksi Mingguan')
    expect(textContent).toContain('75%')
    expect(textContent).toContain('3 dari 4 tugas')
    expect(textContent).toContain('3j')
    expect(textContent).toContain('pagi')
    expect(textContent).toContain('4.2')
    expect(textContent).toContain('1')
    expect(textContent).toContain('Minggu produktif dengan 3 tugas tuntas')
    expect(textContent).toContain('Apa strategi terbaik yang ingin kamu pertahankan')
    expect(textContent).toContain('Simpan Refleksi')
  })

  it('renders empty history state when no past reflections exist', () => {
    const html = renderToString(
      <RefleksiShell
        userNama="Budi"
        userEmail="budi@example.com"
        initialWeekStart="2026-10-11"
        initialStats={sampleStats}
        initialReflection={null}
        initialHistory={[]}
        initialTasks={[]}
        initialBlocks={[]}
        initialEnergyLogs={[]}
      />
    )

    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('Belum ada riwayat refleksi tersimpan')
    expect(textContent).toContain('Setiap akhir pekan, tulis dan simpan refleksi mingguanmu')
  })
})
