import {
  AuthError,
  RateLimitError,
  ServerError,
  TimeoutError,
  type AiRequest,
} from '../types'

function parseRetryAfter(headerVal: string | null): number | undefined {
  if (!headerVal) return undefined
  const seconds = parseInt(headerVal, 10)
  if (!isNaN(seconds)) {
    return seconds * 1000
  }
  const dateMs = Date.parse(headerVal)
  if (!isNaN(dateMs)) {
    const diff = dateMs - Date.now()
    return diff > 0 ? diff : 0
  }
  return undefined
}

export async function callOpenAi(
  model: string,
  apiKey: string,
  req: AiRequest<unknown>,
  signal?: AbortSignal,
  baseUrl = 'https://api.openai.com/v1'
): Promise<string> {
  const jsonInstruction = 'Respond with a single valid JSON object only.'
  const systemContent = req.system
    ? `${req.system}\n${jsonInstruction}`
    : jsonInstruction

  const isOSeries = model.startsWith('o1') || model.startsWith('o3')

  const messages = isOSeries
    ? [
        { role: 'developer', content: systemContent },
        { role: 'user', content: req.prompt },
      ]
    : [
        { role: 'system', content: systemContent },
        { role: 'user', content: req.prompt },
      ]

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '')

  const executeCall = async (includeFormat: boolean) => {
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: false,
    }

    if (!isOSeries) {
      body.temperature = req.temperature ?? 0.2
      body.max_tokens = req.maxOutputTokens ?? 1024
    } else {
      body.max_completion_tokens = req.maxOutputTokens ?? 1024
    }

    if (includeFormat) {
      body.response_format = { type: 'json_object' }
    }

    return fetch(`${cleanBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    })
  }

  try {
    let res = await executeCall(true)

    if (res.status === 400) {
      res = await executeCall(false)
    }

    if (!res.ok) {
      const retryAfterMs = parseRetryAfter(res.headers.get('Retry-After'))
      const errorText = await res.text().catch(() => '')

      let errorMessage = errorText
      let errorCode = ''
      try {
        const errJson = JSON.parse(errorText) as {
          error?: { message?: string; code?: string }
        }
        if (errJson.error?.message) {
          errorMessage = errJson.error.message
        }
        if (errJson.error?.code) {
          errorCode = errJson.error.code
        }
      } catch {
      }

      if (res.status === 429) {
        const lower = `${errorMessage} ${errorCode}`.toLowerCase()
        const isDaily =
          errorCode === 'insufficient_quota' ||
          lower.includes('quota') ||
          lower.includes('billing') ||
          lower.includes('per day') ||
          lower.includes('daily') ||
          lower.includes('rpd')
        throw new RateLimitError(
          isDaily ? 'rpd' : 'rpm',
          retryAfterMs,
          errorMessage || 'OpenAI 429'
        )
      }

      if (res.status === 401 || res.status === 403) {
        throw new AuthError(errorMessage || 'OpenAI 401/403 Unauthorized')
      }

      if (res.status >= 500) {
        throw new ServerError(errorMessage || `OpenAI ${res.status}`, res.status)
      }

      throw new ServerError(errorMessage || `OpenAI ${res.status}`, res.status)
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = json.choices?.[0]?.message?.content
    if (!content) {
      throw new ServerError('OpenAI response did not contain content')
    }

    return content
  } catch (err) {
    if (signal?.aborted) {
      throw new TimeoutError('OpenAI request aborted or timed out')
    }
    if (
      err instanceof RateLimitError ||
      err instanceof AuthError ||
      err instanceof ServerError ||
      err instanceof TimeoutError
    ) {
      throw err
    }

    const msg = err instanceof Error ? err.message : String(err)
    throw new ServerError(msg)
  }
}
