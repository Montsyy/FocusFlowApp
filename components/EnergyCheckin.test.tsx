import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { EnergyCheckin } from './EnergyCheckin'

vi.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      upsert: () => ({
        select: () => ({
          single: vi.fn().mockResolvedValue({ data: {}, error: null }),
        }),
      }),
    }),
  }),
}))

vi.mock('./Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}))

describe('EnergyCheckin Component', () => {
  it('renders three sliders for pagi, siang, and malam', () => {
    const html = renderToString(<EnergyCheckin />)
    expect(html).toContain('Pagi (06:00 - 12:00)')
    expect(html).toContain('Siang (12:00 - 18:00)')
    expect(html).toContain('Malam (18:00 - 23:00)')
  })

  it('renders mood options', () => {
    const html = renderToString(<EnergyCheckin />)
    expect(html).toContain('Kondisi Mood Hari Ini')
    expect(html).toContain('Fokus')
    expect(html).toContain('Semangat')
    expect(html).toContain('Tenang')
    expect(html).toContain('Lelah')
    expect(html).toContain('Kewalahan')
  })

  it('renders slider range inputs with step 1 min 1 max 5', () => {
    const html = renderToString(<EnergyCheckin />)
    expect(html).toContain('min="1"')
    expect(html).toContain('max="5"')
    expect(html).toContain('step="1"')
  })
})
