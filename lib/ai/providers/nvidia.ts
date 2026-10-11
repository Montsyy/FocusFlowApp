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

export async function callNvidia(
  model: string,
  apiKey: string,
  req: AiRequest<unknown>,
  signal?: AbortSignal,
  baseUrl = 'https://integrate.api.nvidia.com/v1'
): Promise<string> {
  const jsonInstruction = 'Respond with a single valid JSON object only.'
  const systemContent = req.system
    ? `${req.system}\n${jsonInstruction}`
    : jsonInstruction

  const messages = [
    { role: 'system', content: systemContent },
    { role: 'user', content: req.prompt },
  ]

  const executeCall = async (includeFormat: boolean) => {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: req.temperature ?? 0.2,
      max_tokens: req.maxOutputTokens ?? 1024,
      stream: false,
    }

    if (includeFormat) {
      body.response_format = { type: 'json_object' }
    }

    return fetch(`${baseUrl}/chat/completions`, {
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

      if (res.status === 429) {
        const lower = errorText.toLowerCase()
        const isDaily = lower.includes('per day') || lower.includes('daily') || lower.includes('rpd')
        throw new RateLimitError(isDaily ? 'rpd' : 'rpm', retryAfterMs, errorText || 'NVIDIA 429')
      }

      if (res.status === 401 || res.status === 403) {
        throw new AuthError(errorText || 'NVIDIA 401/403 Unauthorized')
      }

      if (res.status >= 500) {
        throw new ServerError(errorText || `NVIDIA ${res.status}`, res.status)
      }

      throw new ServerError(errorText || `NVIDIA ${res.status}`, res.status)
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }

    const content = json.choices?.[0]?.message?.content
    if (!content) {
      throw new ServerError('NVIDIA response did not contain content')
    }

    return content
  } catch (err) {
    if (signal?.aborted) {
      throw new TimeoutError('NVIDIA request aborted or timed out')
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
