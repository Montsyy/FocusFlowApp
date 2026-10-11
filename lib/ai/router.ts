import { getAiConfig, type AiConfig } from './config'
import {
  isCoolingDown,
  markCooldown,
  nextAvailable,
  type Clock,
} from './cooldown'
import { extractJson } from './json'
import { callGemini } from './providers/gemini'
import { callNvidia } from './providers/nvidia'
import { callOpenAi } from './providers/openai'
import {
  AllProvidersFailedError,
  AuthError,
  RateLimitError,
  ServerError,
  TimeoutError,
  type AiRequest,
  type AiResult,
  type AiTarget,
  type AttemptSummary,
} from './types'

export interface RouterOptions {
  config?: AiConfig
  clock?: Clock
}

interface Candidate {
  target: AiTarget
  keyIndex: number
  key: string
  keyId: string
}

function sanitizeErrorMessage(msg: string, keys: string[]): string {
  let clean = msg
  for (const k of keys) {
    if (k && k.length > 4) {
      clean = clean.split(k).join('[REDACTED_KEY]')
    }
  }
  return clean
}

export async function generateStructured<T>(
  req: AiRequest<T>,
  options: RouterOptions = {}
): Promise<AiResult<T>> {
  const config = options.config ?? getAiConfig()
  const clock = options.clock ?? (() => Date.now())

  const allKeys = [
    ...config.geminiKeys,
    ...config.nvidiaKeys,
    ...config.openaiKeys,
  ]

  if (config.demoFallback) {
    throw new AllProvidersFailedError(
      [
        {
          target: config.targets[0] ?? { provider: 'gemini', model: 'demo' },
          error: 'DEMO_FALLBACK enabled',
        },
      ],
      'DEMO_FALLBACK mode active'
    )
  }

  const allCandidates: Candidate[] = []
  for (const target of config.targets) {
    const keys =
      target.provider === 'gemini'
        ? config.geminiKeys
        : target.provider === 'nvidia'
        ? config.nvidiaKeys
        : config.openaiKeys
    for (let i = 0; i < keys.length; i++) {
      allCandidates.push({
        target,
        keyIndex: i,
        key: keys[i]!,
        keyId: `${target.provider}:${target.model}:${i}`,
      })
    }
  }

  if (allCandidates.length === 0) {
    throw new AllProvidersFailedError(
      config.targets.map((t) => ({
        target: t,
        error: `No API keys available for ${t.provider}`,
      })),
      'No candidate targets with API keys available'
    )
  }

  const eligibleCandidates = allCandidates.filter(
    (c) => !isCoolingDown(c.keyId, clock)
  )

  let candidatesToTry = eligibleCandidates
  if (candidatesToTry.length === 0) {
    const earliest = nextAvailable(
      allCandidates.map((c) => c.keyId),
      clock
    )
    if (earliest) {
      const match = allCandidates.find((c) => c.keyId === earliest.key)
      candidatesToTry = match ? [match] : allCandidates
    } else {
      candidatesToTry = allCandidates
    }
  }

  const startTime = clock()
  const deadline = startTime + config.totalBudgetMs
  const attempts: AttemptSummary[] = []
  let attemptCount = 0

  for (const candidate of candidatesToTry) {
    const now = clock()
    const remainingBudget = deadline - now
    if (remainingBudget < 1500) {
      attempts.push({
        target: candidate.target,
        error: 'Total budget exhausted before attempt',
      })
      break
    }

    attemptCount++
    const attemptTimeout = Math.min(config.attemptTimeoutMs, remainingBudget)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), attemptTimeout)

    const executeCall = async (
      promptToUse: string
    ): Promise<string> => {
      const requestWithPrompt: AiRequest<unknown> = {
        ...req,
        prompt: promptToUse,
      }

      if (candidate.target.provider === 'gemini') {
        return callGemini(
          candidate.target.model,
          candidate.key,
          requestWithPrompt,
          controller.signal
        )
      }

      if (candidate.target.provider === 'nvidia') {
        return callNvidia(
          candidate.target.model,
          candidate.key,
          requestWithPrompt,
          controller.signal,
          config.nvidiaBaseUrl
        )
      }

      return callOpenAi(
        candidate.target.model,
        candidate.key,
        requestWithPrompt,
        controller.signal,
        config.openaiBaseUrl
      )
    }

    try {
      let rawOutput: string
      try {
        rawOutput = await executeCall(req.prompt)
      } finally {
        clearTimeout(timeoutId)
      }

      let parsedJson: unknown
      let validationResult: { success: boolean; data?: T; error?: { message: string } }

      try {
        parsedJson = extractJson(rawOutput)
        const parseCheck = req.schema.safeParse(parsedJson)
        validationResult = parseCheck.success
          ? { success: true, data: parseCheck.data }
          : { success: false, error: { message: parseCheck.error.message } }
      } catch (extractErr) {
        const msg = extractErr instanceof Error ? extractErr.message : 'Invalid JSON'
        validationResult = { success: false, error: { message: msg } }
      }

      if (!validationResult.success) {
        const repairBudget = deadline - clock()
        if (repairBudget >= 1500) {
          const repairController = new AbortController()
          const repairTimeout = Math.min(config.attemptTimeoutMs, repairBudget)
          const repairTimeoutId = setTimeout(
            () => repairController.abort(),
            repairTimeout
          )

          try {
            const repairPrompt = `${req.prompt}\n\nInstruksi perbaikan: Output sebelumnya tidak valid (${validationResult.error?.message}). Kembalikan HANYA satu objek JSON valid yang tepat.`
            const repairOutput =
              candidate.target.provider === 'gemini'
                ? await callGemini(
                    candidate.target.model,
                    candidate.key,
                    { ...req, prompt: repairPrompt },
                    repairController.signal
                  )
                : candidate.target.provider === 'nvidia'
                ? await callNvidia(
                    candidate.target.model,
                    candidate.key,
                    { ...req, prompt: repairPrompt },
                    repairController.signal,
                    config.nvidiaBaseUrl
                  )
                : await callOpenAi(
                    candidate.target.model,
                    candidate.key,
                    { ...req, prompt: repairPrompt },
                    repairController.signal,
                    config.openaiBaseUrl
                  )

            const repairJson = extractJson(repairOutput)
            const repairCheck = req.schema.safeParse(repairJson)
            if (repairCheck.success) {
              return {
                data: repairCheck.data,
                provider: candidate.target.provider,
                model: candidate.target.model,
                attempts: attemptCount + 1,
              }
            }
          } catch {
          } finally {
            clearTimeout(repairTimeoutId)
          }
        }

        markCooldown(candidate.keyId, 15000, clock)
        attempts.push({
          target: candidate.target,
          error: 'Invalid output after repair attempt',
        })
        continue
      }

      return {
        data: validationResult.data as T,
        provider: candidate.target.provider,
        model: candidate.target.model,
        attempts: attemptCount,
      }
    } catch (err) {
      clearTimeout(timeoutId)
      const rawErrorMsg = err instanceof Error ? err.message : String(err)
      const cleanErrorMsg = sanitizeErrorMessage(rawErrorMsg, allKeys)

      if (err instanceof RateLimitError) {
        const cooldownMs =
          err.scope === 'rpd'
            ? config.cooldownRpdMs
            : err.retryAfterMs ?? config.cooldownRpmMs
        markCooldown(candidate.keyId, cooldownMs, clock)
        if (err.scope === 'rpd') {
          for (const c of allCandidates) {
            if (
              c.target.provider === candidate.target.provider &&
              c.keyIndex === candidate.keyIndex
            ) {
              markCooldown(c.keyId, cooldownMs, clock)
            }
          }
        }
        attempts.push({
          target: candidate.target,
          error: `RateLimitError (${err.scope}): ${cleanErrorMsg}`,
        })
      } else if (err instanceof AuthError) {
        const authCooldownMs = 24 * 60 * 60 * 1000
        markCooldown(candidate.keyId, authCooldownMs, clock)
        for (const c of allCandidates) {
          if (
            c.target.provider === candidate.target.provider &&
            c.keyIndex === candidate.keyIndex
          ) {
            markCooldown(c.keyId, authCooldownMs, clock)
          }
        }
        console.warn(
          `[FocusFlow AI] Auth failure on ${candidate.target.provider}:${candidate.target.model} key #${candidate.keyIndex}`
        )
        attempts.push({
          target: candidate.target,
          error: `AuthError: ${cleanErrorMsg}`,
        })
      } else if (err instanceof ServerError || err instanceof TimeoutError) {
        markCooldown(candidate.keyId, 15000, clock)
        attempts.push({
          target: candidate.target,
          error: `${err.name}: ${cleanErrorMsg}`,
        })
      } else {
        markCooldown(candidate.keyId, 15000, clock)
        attempts.push({
          target: candidate.target,
          error: `Unexpected error: ${cleanErrorMsg}`,
        })
      }
    }
  }

  throw new AllProvidersFailedError(attempts)
}
