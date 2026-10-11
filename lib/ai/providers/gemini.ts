import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  AuthError,
  RateLimitError,
  ServerError,
  TimeoutError,
  type AiRequest,
} from '../types'

export async function callGemini(
  model: string,
  apiKey: string,
  req: AiRequest<unknown>,
  signal?: AbortSignal
): Promise<string> {
  try {
    const genAi = new GoogleGenerativeAI(apiKey)
    const isGemma = model.toLowerCase().includes('gemma')
    const generationConfig: Record<string, unknown> = {
      temperature: req.temperature ?? 0.2,
      maxOutputTokens: req.maxOutputTokens ?? 1024,
    }
    if (!isGemma) {
      generationConfig.responseMimeType = 'application/json'
    }

    const geminiModel = genAi.getGenerativeModel({
      model,
      generationConfig,
      systemInstruction: isGemma ? undefined : req.system,
    })

    const promptText =
      isGemma && req.system
        ? `${req.system}\n\nRespond with a single valid JSON object only.\n\n${req.prompt}`
        : req.prompt

    const result = await geminiModel.generateContent(
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: promptText }],
          },
        ],
      },
      { signal }
    )

    const response = await result.response
    return response.text()
  } catch (err) {
    if (signal?.aborted) {
      throw new TimeoutError('Gemini request aborted or timed out')
    }

    const errorMsg = err instanceof Error ? err.message : String(err)
    const errStatus = (err as { status?: number })?.status

    if (
      errStatus === 429 ||
      errorMsg.includes('429') ||
      errorMsg.includes('RESOURCE_EXHAUSTED') ||
      errorMsg.toLowerCase().includes('quota') ||
      errorMsg.toLowerCase().includes('rate limit')
    ) {
      const lower = errorMsg.toLowerCase()
      const isDaily =
        lower.includes('per day') ||
        lower.includes('daily') ||
        lower.includes('rpd') ||
        lower.includes('limit: 0')
      throw new RateLimitError(isDaily ? 'rpd' : 'rpm', undefined, errorMsg)
    }

    if (
      errStatus === 401 ||
      errStatus === 403 ||
      errorMsg.includes('API_KEY_INVALID') ||
      errorMsg.toLowerCase().includes('api key not valid') ||
      errorMsg.toLowerCase().includes('permission_denied')
    ) {
      throw new AuthError(errorMsg)
    }

    if (
      errStatus === 500 ||
      errStatus === 503 ||
      errorMsg.toLowerCase().includes('internal') ||
      errorMsg.toLowerCase().includes('unavailable')
    ) {
      throw new ServerError(errorMsg, errStatus)
    }

    throw new ServerError(errorMsg, errStatus)
  }
}
