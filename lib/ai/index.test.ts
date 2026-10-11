import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  extractJson,
  generateStructured,
  isCoolingDown,
  markCooldown,
  nextAvailable,
  parseTask,
  resetCooldowns,
  parseChain,
  type AiConfig,
} from './index'
import { z } from 'zod'
import {
  AllProvidersFailedError,
  AuthError,
  InvalidOutputError,
  RateLimitError,
} from './types'
import { callOpenAi } from './providers/openai'
import { callGemini } from './providers/gemini'

const sampleSchema = z.object({
  greeting: z.string(),
  count: z.number(),
})

const mockConfig: AiConfig = {
  targets: [
    { provider: 'gemini', model: 'gemini-2.5-flash' },
    { provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct' },
  ],
  geminiKeys: ['gemini-key-1', 'gemini-key-2'],
  nvidiaKeys: ['nvidia-key-1'],
  nvidiaBaseUrl: 'https://integrate.api.nvidia.com/v1',
  openaiKeys: ['openai-key-1'],
  openaiBaseUrl: 'https://api.openai.com/v1',
  attemptTimeoutMs: 1000,
  totalBudgetMs: 5000,
  cooldownRpmMs: 60000,
  cooldownRpdMs: 86400000,
  demoFallback: false,
}

const mockGeminiGenerateContent = vi.fn()
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class MockGoogleGenerativeAI {
      apiKey: string
      constructor(apiKey: string) {
        this.apiKey = apiKey
      }
      getGenerativeModel() {
        return {
          generateContent: mockGeminiGenerateContent,
        }
      }
    },
  }
})

describe('Multi-provider AI System', () => {
  let currentTime = 1000000
  const mockClock = () => currentTime

  beforeEach(() => {
    resetCooldowns()
    vi.clearAllMocks()
    currentTime = 1000000
    vi.stubGlobal('fetch', vi.fn())
  })

  describe('JSON Extraction', () => {
    it('parses raw JSON string', () => {
      const parsed = extractJson('{"greeting": "halo", "count": 1}')
      expect(parsed).toEqual({ greeting: 'halo', count: 1 })
    })

    it('parses markdown code fenced JSON', () => {
      const text = '```json\n{"greeting": "halo", "count": 2}\n```'
      const parsed = extractJson(text)
      expect(parsed).toEqual({ greeting: 'halo', count: 2 })
    })

    it('extracts embedded JSON surrounded by conversational text', () => {
      const text = 'Berikut adalah hasilnya:\n{"greeting": "halo", "count": 3}\nSemoga membantu!'
      const parsed = extractJson(text)
      expect(parsed).toEqual({ greeting: 'halo', count: 3 })
    })

    it('throws InvalidOutputError when input contains no JSON', () => {
      expect(() => extractJson('Halo tidak ada format json di sini')).toThrow(
        InvalidOutputError
      )
    })
  })

  describe('Cooldown Management', () => {
    it('marks and checks cooldowns with injected clock', () => {
      expect(isCoolingDown('gemini:flash:0', mockClock)).toBe(false)
      markCooldown('gemini:flash:0', 5000, mockClock)
      expect(isCoolingDown('gemini:flash:0', mockClock)).toBe(true)

      currentTime += 6000
      expect(isCoolingDown('gemini:flash:0', mockClock)).toBe(false)
    })

    it('finds next available key among cooling candidates', () => {
      markCooldown('k1', 10000, mockClock)
      markCooldown('k2', 5000, mockClock)

      const next = nextAvailable(['k1', 'k2'], mockClock)
      expect(next?.key).toBe('k2')
      expect(next?.availableAt).toBe(1005000)
    })
  })

  describe('Router Failover and Resilience', () => {
    it('switches to next target when primary target returns 429 RPM', async () => {
      mockGeminiGenerateContent.mockRejectedValueOnce(
        new Error('429 Resource Exhausted rate limit exceeded')
      )

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ greeting: 'dari nvidia', count: 42 }),
              },
            },
          ],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const singleKeyConfig: AiConfig = {
        ...mockConfig,
        geminiKeys: ['gemini-key-1'],
      }

      const res = await generateStructured(
        { prompt: 'test', schema: sampleSchema },
        { config: singleKeyConfig, clock: mockClock }
      )

      expect(res.provider).toBe('nvidia')
      expect(res.model).toBe('meta/llama-3.3-70b-instruct')
      expect(res.data.greeting).toBe('dari nvidia')
      expect(isCoolingDown('gemini:gemini-2.5-flash:0', mockClock)).toBe(true)
    })

    it('enters long cooldown on daily quota exhaustion and uses NVIDIA on subsequent calls', async () => {
      mockGeminiGenerateContent.mockRejectedValueOnce(
        new Error('Resource has been exhausted: quota per day exceeded limit: 0')
      )

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ greeting: 'dari nvidia', count: 10 }),
              },
            },
          ],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const singleKeyConfig: AiConfig = {
        ...mockConfig,
        geminiKeys: ['gemini-key-1'],
      }

      const res1 = await generateStructured(
        { prompt: 'call1', schema: sampleSchema },
        { config: singleKeyConfig, clock: mockClock }
      )
      expect(res1.provider).toBe('nvidia')

      currentTime += 60000

      expect(isCoolingDown('gemini:gemini-2.5-flash:0', mockClock)).toBe(true)

      const res2 = await generateStructured(
        { prompt: 'call2', schema: sampleSchema },
        { config: singleKeyConfig, clock: mockClock }
      )
      expect(res2.provider).toBe('nvidia')
      expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(1)
    })

    it('skips key on 401 AuthError and moves to next key of same provider', async () => {
      mockGeminiGenerateContent
        .mockRejectedValueOnce(new Error('API_KEY_INVALID: 401 Unauthorized'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify({ greeting: 'key 2 sukses', count: 7 }),
          },
        })

      const res = await generateStructured(
        { prompt: 'test auth', schema: sampleSchema },
        { config: mockConfig, clock: mockClock }
      )

      expect(res.provider).toBe('gemini')
      expect(res.data.greeting).toBe('key 2 sukses')
      expect(isCoolingDown('gemini:gemini-2.5-flash:0', mockClock)).toBe(true)
      expect(isCoolingDown('gemini:gemini-2.5-flash:1', mockClock)).toBe(false)
    })

    it('rotates through keys within a provider before moving to another provider', async () => {
      mockGeminiGenerateContent
        .mockRejectedValueOnce(new Error('429 rate limit key 1'))
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify({ greeting: 'key 2 berhasil', count: 8 }),
          },
        })

      const res = await generateStructured(
        { prompt: 'test key rotation', schema: sampleSchema },
        { config: mockConfig, clock: mockClock }
      )

      expect(res.provider).toBe('gemini')
      expect(res.data.greeting).toBe('key 2 berhasil')
      expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(2)
      expect(fetch).not.toHaveBeenCalled()
    })

    it('handles attempt timeout and proceeds to next candidate without exceeding budget', async () => {
      mockGeminiGenerateContent.mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('AbortError')), 50)
          })
      )

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ greeting: 'nvidia setelah timeout', count: 99 }),
              },
            },
          ],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const fastTimeoutConfig: AiConfig = {
        ...mockConfig,
        geminiKeys: ['gemini-key-1'],
        attemptTimeoutMs: 20,
        totalBudgetMs: 2000,
      }

      const res = await generateStructured(
        { prompt: 'test timeout', schema: sampleSchema },
        { config: fastTimeoutConfig, clock: mockClock }
      )

      expect(res.provider).toBe('nvidia')
      expect(res.data.count).toBe(99)
    })

    it('triggers repair retry on invalid JSON schema and then succeeds', async () => {
      mockGeminiGenerateContent
        .mockResolvedValueOnce({
          response: {
            text: () => '{"greeting": "kurang field count"}',
          },
        })
        .mockResolvedValueOnce({
          response: {
            text: () => JSON.stringify({ greeting: 'diperbaiki', count: 12 }),
          },
        })

      const singleKeyConfig: AiConfig = {
        ...mockConfig,
        geminiKeys: ['gemini-key-1'],
      }

      const res = await generateStructured(
        { prompt: 'test repair', schema: sampleSchema },
        { config: singleKeyConfig, clock: mockClock }
      )

      expect(res.provider).toBe('gemini')
      expect(res.data.greeting).toBe('diperbaiki')
      expect(res.data.count).toBe(12)
      expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(2)
    })

    it('retries without response_format when NVIDIA returns 400', async () => {
      const singleNvidiaConfig: AiConfig = {
        ...mockConfig,
        targets: [{ provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct' }],
      }

      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 400,
          ok: false,
          text: async () => 'response_format is not supported by this model',
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({ greeting: 'sukses tanpa format', count: 50 }),
                },
              },
            ],
          }),
        })
      vi.stubGlobal('fetch', mockFetch)

      const res = await generateStructured(
        { prompt: 'test 400 retry', schema: sampleSchema },
        { config: singleNvidiaConfig, clock: mockClock }
      )

      expect(res.provider).toBe('nvidia')
      expect(res.data.greeting).toBe('sukses tanpa format')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('makes target eligible again after cooldown expiration', async () => {
      markCooldown('gemini:gemini-2.5-flash:0', 5000, mockClock)
      expect(isCoolingDown('gemini:gemini-2.5-flash:0', mockClock)).toBe(true)

      currentTime += 6000
      expect(isCoolingDown('gemini:gemini-2.5-flash:0', mockClock)).toBe(false)
    })

    it('throws AllProvidersFailedError without revealing secret API keys', async () => {
      mockGeminiGenerateContent.mockRejectedValue(
        new Error('Gemini API key gemini-key-1 is invalid')
      )

      const mockFetch = vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        text: async () => 'Bearer nvidia-key-1 unauthorized',
      })
      vi.stubGlobal('fetch', mockFetch)

      let caughtError: unknown = null
      try {
        await generateStructured(
          { prompt: 'test failure', schema: sampleSchema },
          { config: mockConfig, clock: mockClock }
        )
      } catch (err) {
        caughtError = err
      }

      expect(caughtError).toBeInstanceOf(AllProvidersFailedError)
      const apf = caughtError as AllProvidersFailedError
      expect(apf.attempts.length).toBeGreaterThan(0)

      for (const att of apf.attempts) {
        expect(att.error).not.toContain('gemini-key-1')
        expect(att.error).not.toContain('nvidia-key-1')
      }
    })

    it('returns template fallback when all providers fail in high-level parseTask', async () => {
      mockGeminiGenerateContent.mockRejectedValue(new Error('Fatal error'))
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          status: 500,
          ok: false,
          text: async () => 'Server error',
        })
      )

      const result = await parseTask(
        'Tugas Kimia Organik 90 menit',
        new Date('2026-10-12T00:00:00.000Z'),
        { config: mockConfig, clock: mockClock }
      )

      expect(result.fallbackUsed).toBe(true)
      expect(result.provider).toBe('fallback')
      expect(result.data.title).toContain('Tugas Kimia Organik')
      expect(result.data.estimated_minutes).toBe(60)
    })

    it('bypasses network calls when DEMO_FALLBACK is true', async () => {
      const demoConfig: AiConfig = {
        ...mockConfig,
        demoFallback: true,
      }

      const result = await parseTask(
        'Laporan Fisika Komputasi',
        new Date('2026-10-12T00:00:00.000Z'),
        { config: demoConfig, clock: mockClock }
      )

      expect(result.fallbackUsed).toBe(true)
      expect(result.provider).toBe('fallback')
      expect(mockGeminiGenerateContent).not.toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('OpenAI Provider and Router Integration', () => {
    it('calls OpenAI endpoint and successfully parses structured JSON', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ greeting: 'halo dari gpt-4o-mini', count: 100 }),
              },
            },
          ],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const output = await callOpenAi(
        'gpt-4o-mini',
        'sk-test-key',
        { prompt: 'test openai', schema: sampleSchema }
      )

      expect(JSON.parse(output)).toEqual({ greeting: 'halo dari gpt-4o-mini', count: 100 })
      expect(mockFetch).toHaveBeenCalledTimes(1)
      const fetchArgs = mockFetch.mock.calls[0]
      expect(fetchArgs[0]).toBe('https://api.openai.com/v1/chat/completions')
      const sentBody = JSON.parse(fetchArgs[1].body)
      expect(sentBody.model).toBe('gpt-4o-mini')
      expect(sentBody.response_format).toEqual({ type: 'json_object' })
    })

    it('handles o-series models with developer role and max_completion_tokens', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ greeting: 'halo dari o3-mini', count: 3 }),
              },
            },
          ],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await callOpenAi(
        'o3-mini',
        'sk-test-key',
        { prompt: 'test o-series', schema: sampleSchema, system: 'system prompt' }
      )

      const fetchArgs = mockFetch.mock.calls[0]
      const sentBody = JSON.parse(fetchArgs[1].body)
      expect(sentBody.model).toBe('o3-mini')
      expect(sentBody.messages[0].role).toBe('developer')
      expect(sentBody.max_completion_tokens).toBe(1024)
      expect(sentBody.temperature).toBeUndefined()
    })

    it('falls back without response_format if OpenAI returns 400', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce({
          status: 400,
          ok: false,
          text: async () => 'response_format is not supported',
        })
        .mockResolvedValueOnce({
          status: 200,
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({ greeting: 'sukses fallback format', count: 4 }),
                },
              },
            ],
          }),
        })
      vi.stubGlobal('fetch', mockFetch)

      const output = await callOpenAi(
        'gpt-4o-mini',
        'sk-test-key',
        { prompt: 'test 400 fallback', schema: sampleSchema }
      )

      expect(JSON.parse(output).greeting).toBe('sukses fallback format')
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('throws RateLimitError (rpd) on OpenAI insufficient_quota', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        status: 429,
        ok: false,
        headers: new Headers(),
        text: async () =>
          JSON.stringify({
            error: {
              message: 'You exceeded your current quota',
              type: 'insufficient_quota',
              code: 'insufficient_quota',
            },
          }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const quotaPromise = callOpenAi('gpt-4o-mini', 'sk-test-key', {
        prompt: 'quota test',
        schema: sampleSchema,
      })
      await expect(quotaPromise).rejects.toBeInstanceOf(RateLimitError)
      await expect(quotaPromise).rejects.toMatchObject({
        scope: 'rpd',
      })
    })

    it('throws AuthError on OpenAI 401 Unauthorized', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        status: 401,
        ok: false,
        headers: new Headers(),
        text: async () =>
          JSON.stringify({
            error: { message: 'Incorrect API key provided' },
          }),
      })
      vi.stubGlobal('fetch', mockFetch)

      await expect(
        callOpenAi('gpt-4o-mini', 'sk-invalid', { prompt: 'auth test', schema: sampleSchema })
      ).rejects.toBeInstanceOf(AuthError)
    })

    it('routes to OpenAI target when specified in AI chain', async () => {
      const openAiConfig: AiConfig = {
        ...mockConfig,
        targets: [{ provider: 'openai', model: 'gpt-4o-mini' }],
        openaiKeys: ['sk-openai-key-primary'],
      }

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ greeting: 'sukses router openai', count: 77 }),
              },
            },
          ],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const res = await generateStructured(
        { prompt: 'test openai routing', schema: sampleSchema },
        { config: openAiConfig, clock: mockClock }
      )

      expect(res.provider).toBe('openai')
      expect(res.model).toBe('gpt-4o-mini')
      expect(res.data.greeting).toBe('sukses router openai')
    })

    it('fails over from Gemini to OpenAI when Gemini 429 occurs', async () => {
      mockGeminiGenerateContent.mockRejectedValueOnce(
        new Error('429 Resource Exhausted rate limit exceeded')
      )

      const failoverConfig: AiConfig = {
        ...mockConfig,
        targets: [
          { provider: 'gemini', model: 'gemini-2.5-flash' },
          { provider: 'openai', model: 'gpt-4o-mini' },
          { provider: 'nvidia', model: 'meta/llama-3.3-70b-instruct' },
        ],
        geminiKeys: ['gemini-key-1'],
        openaiKeys: ['openai-key-1'],
      }

      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({ greeting: 'openai failover sukses', count: 88 }),
              },
            },
          ],
        }),
      })
      vi.stubGlobal('fetch', mockFetch)

      const res = await generateStructured(
        { prompt: 'test failover gemini to openai', schema: sampleSchema },
        { config: failoverConfig, clock: mockClock }
      )

      expect(res.provider).toBe('openai')
      expect(res.model).toBe('gpt-4o-mini')
      expect(res.data.greeting).toBe('openai failover sukses')
      expect(isCoolingDown('gemini:gemini-2.5-flash:0', mockClock)).toBe(true)
    })
  })

  describe('New Models & Normalization Support', () => {
    it('correctly parses and normalizes chain entries with new models and space formatting', () => {
      const chainStr =
        'openai:gpt-5.4-mini,openai:gpt-6-luna,openai:gpt-4.1-mini,gemini:Gemini 2.5 Flash Lite,gemini:Gemini 3.1 Flash Lite,gemini:Gemma 4 26B,nvidia:z-ai/glm-5.3-flash,nvidia:deepseek-ai/deepseek-v4.1-flash,nvidia:meta/muse-glimmer-30b'
      const parsed = parseChain(chainStr)

      expect(parsed).toEqual([
        { provider: 'openai', model: 'gpt-5.4-mini' },
        { provider: 'openai', model: 'gpt-6-luna' },
        { provider: 'openai', model: 'gpt-4.1-mini' },
        { provider: 'gemini', model: 'gemini-2.5-flash-lite' },
        { provider: 'gemini', model: 'gemini-3.1-flash-lite' },
        { provider: 'gemini', model: 'gemma-4-26b' },
        { provider: 'nvidia', model: 'z-ai/glm-5.3-flash' },
        { provider: 'nvidia', model: 'deepseek-ai/deepseek-v4.1-flash' },
        { provider: 'nvidia', model: 'meta/muse-glimmer-30b' },
      ])
    })

    it('handles Gemma models safely without responseMimeType in callGemini', async () => {
      mockGeminiGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({ greeting: 'dari gemma', count: 26 }),
        },
      })

      const output = await callGemini(
        'gemma-4-26b',
        'gemini-key',
        { prompt: 'test gemma', schema: sampleSchema, system: 'kamu asisten' }
      )

      expect(JSON.parse(output)).toEqual({ greeting: 'dari gemma', count: 26 })
      expect(mockGeminiGenerateContent).toHaveBeenCalledTimes(1)
    })
  })
})
