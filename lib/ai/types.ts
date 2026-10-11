import type { z } from 'zod'

export type AiProvider = 'gemini' | 'nvidia' | 'openai'

export interface AiTarget {
  provider: AiProvider
  model: string
}

export interface AiRequest<T> {
  system?: string
  prompt: string
  schema: z.ZodType<T>
  temperature?: number
  maxOutputTokens?: number
}

export interface AiResult<T> {
  data: T
  provider: AiProvider
  model: string
  attempts: number
  fallbackUsed?: boolean
}

export interface AttemptSummary {
  target: AiTarget
  error: string
}

export class RateLimitError extends Error {
  readonly scope: 'rpm' | 'rpd'
  readonly retryAfterMs?: number

  constructor(scope: 'rpm' | 'rpd', retryAfterMs?: number, message?: string) {
    super(message ?? `Rate limit exceeded (${scope})`)
    this.name = 'RateLimitError'
    this.scope = scope
    this.retryAfterMs = retryAfterMs
  }
}

export class AuthError extends Error {
  constructor(message = 'Authentication failed with provider') {
    super(message)
    this.name = 'AuthError'
  }
}

export class ServerError extends Error {
  readonly statusCode?: number

  constructor(message = 'Provider server error', statusCode?: number) {
    super(message)
    this.name = 'ServerError'
    this.statusCode = statusCode
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Request attempt timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

export class InvalidOutputError extends Error {
  readonly rawOutput?: string

  constructor(message = 'Output did not match expected schema', rawOutput?: string) {
    super(message)
    this.name = 'InvalidOutputError'
    this.rawOutput = rawOutput
  }
}

export class AllProvidersFailedError extends Error {
  readonly attempts: AttemptSummary[]

  constructor(attempts: AttemptSummary[], message = 'All AI providers in chain failed') {
    super(message)
    this.name = 'AllProvidersFailedError'
    this.attempts = attempts
  }
}
