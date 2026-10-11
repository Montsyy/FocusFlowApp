import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GET } from './route'
import * as aiModule from '@/lib/ai'

vi.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: vi.fn().mockResolvedValue({
    user: { id: 'test-user-id' },
    response: null,
  }),
}))

describe('GET /api/ai-status', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    aiModule.resetCooldowns()
  })

  it('returns connected when all candidates are healthy and active target is first target', async () => {
    vi.spyOn(aiModule, 'getAiConfig').mockReturnValue({
      targets: [
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'gemini', model: 'gemini-2.5-flash' },
      ],
      geminiKeys: ['gemini-key-1'],
      nvidiaKeys: [],
      nvidiaBaseUrl: 'https://integrate.api.nvidia.com/v1',
      openaiKeys: ['openai-key-1'],
      openaiBaseUrl: 'https://api.openai.com/v1',
      attemptTimeoutMs: 5000,
      totalBudgetMs: 15000,
      cooldownRpmMs: 60000,
      cooldownRpdMs: 86400000,
      demoFallback: false,
    })

    const response = await GET()
    const json = await response.json()

    expect(json.connectionState).toBe('connected')
    expect(json.activeTarget).toEqual({ provider: 'openai', model: 'gpt-4o-mini' })
    expect(json.coolingDown).toHaveLength(0)
  })

  it('switches active target to next provider and stays connected when only one provider is cooling down', async () => {
    vi.spyOn(aiModule, 'getAiConfig').mockReturnValue({
      targets: [
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'gemini', model: 'gemini-2.5-flash' },
      ],
      geminiKeys: ['gemini-key-1'],
      nvidiaKeys: [],
      nvidiaBaseUrl: 'https://integrate.api.nvidia.com/v1',
      openaiKeys: ['openai-key-1', 'openai-key-2'],
      openaiBaseUrl: 'https://api.openai.com/v1',
      attemptTimeoutMs: 5000,
      totalBudgetMs: 15000,
      cooldownRpmMs: 60000,
      cooldownRpdMs: 86400000,
      demoFallback: false,
    })

    aiModule.markCooldown('openai:gpt-4o-mini:0', 80000)
    aiModule.markCooldown('openai:gpt-4o-mini:1', 85000)

    const response = await GET()
    const json = await response.json()

    expect(json.connectionState).toBe('connected')
    expect(json.activeTarget).toEqual({ provider: 'gemini', model: 'gemini-2.5-flash' })
    expect(json.coolingDown).toHaveLength(1)
    expect(json.coolingDown[0].provider).toBe('openai')
    expect(json.coolingDown[0].remainingMs).toBeGreaterThan(80000)
  })

  it('returns pending only when all candidate targets are cooling down', async () => {
    vi.spyOn(aiModule, 'getAiConfig').mockReturnValue({
      targets: [
        { provider: 'openai', model: 'gpt-4o-mini' },
        { provider: 'gemini', model: 'gemini-2.5-flash' },
      ],
      geminiKeys: ['gemini-key-1'],
      nvidiaKeys: [],
      nvidiaBaseUrl: 'https://integrate.api.nvidia.com/v1',
      openaiKeys: ['openai-key-1'],
      openaiBaseUrl: 'https://api.openai.com/v1',
      attemptTimeoutMs: 5000,
      totalBudgetMs: 15000,
      cooldownRpmMs: 60000,
      cooldownRpdMs: 86400000,
      demoFallback: false,
    })

    aiModule.markCooldown('openai:gpt-4o-mini:0', 50000)
    aiModule.markCooldown('gemini:gemini-2.5-flash:0', 60000)

    const response = await GET()
    const json = await response.json()

    expect(json.connectionState).toBe('pending')
    expect(json.activeTarget).toBeUndefined()
    expect(json.coolingDown).toHaveLength(2)
  })

  it('returns not_connected when demo fallback is enabled or keys are missing', async () => {
    vi.spyOn(aiModule, 'getAiConfig').mockReturnValue({
      targets: [{ provider: 'gemini', model: 'gemini-2.5-flash' }],
      geminiKeys: [],
      nvidiaKeys: [],
      nvidiaBaseUrl: 'https://integrate.api.nvidia.com/v1',
      openaiKeys: [],
      openaiBaseUrl: 'https://api.openai.com/v1',
      attemptTimeoutMs: 5000,
      totalBudgetMs: 15000,
      cooldownRpmMs: 60000,
      cooldownRpdMs: 86400000,
      demoFallback: false,
    })

    const response = await GET()
    const json = await response.json()

    expect(json.connectionState).toBe('not_connected')
    expect(json.activeTarget).toBeUndefined()
  })
})
