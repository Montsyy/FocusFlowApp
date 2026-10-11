import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  extractJson,
  generateStructured,
  isCoolingDown,
  markCooldown,
  nextAvailable,
  parseTask,
  resetCooldowns,
  type AiConfig,
} from './index'
import { z } from 'zod'
import { AllProvidersFailedError, InvalidOutputError } from './types'

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
})
