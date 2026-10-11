import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { RealityCheck } from './RealityCheck'

describe('RealityCheck Component', () => {
  it('renders an empty bar (0% width) when totalEstimatedMinutes is 0', () => {
    const html = renderToString(<RealityCheck totalEstimatedMinutes={0} />)
    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('0j / 28j kapasitas')
    expect(html).toContain('style="width:0%"')
    expect(html).not.toContain('style="width:15%"')
  })

  it('defaults to 0 minutes and 0% width when no prop is passed', () => {
    const html = renderToString(<RealityCheck />)
    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('0j / 28j kapasitas')
    expect(html).toContain('style="width:0%"')
  })

  it('renders 4% width for 1 hour (60 minutes)', () => {
    const html = renderToString(<RealityCheck totalEstimatedMinutes={60} />)
    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('1j / 28j kapasitas')
    expect(html).toContain('style="width:4%"')
  })

  it('renders 100% and warning text when exceeding safe capacity', () => {
    const html = renderToString(<RealityCheck totalEstimatedMinutes={1800} />)
    const textContent = html.replace(/<!--.*?-->/g, '')
    expect(textContent).toContain('30j / 28j kapasitas')
    expect(html).toContain('style="width:100%"')
    expect(textContent).toContain('Peringatan: Jadwal hampir penuh!')
  })
})
