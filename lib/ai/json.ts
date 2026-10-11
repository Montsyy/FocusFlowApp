import { InvalidOutputError } from './types'

export function extractJson(text: string): unknown {
  if (!text || typeof text !== 'string') {
    throw new InvalidOutputError('Output is empty or not a string', text)
  }

  const cleaned = text
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const firstBrace = cleaned.indexOf('{')
    const firstBracket = cleaned.indexOf('[')

    let startIdx = -1
    let openChar = ''
    let closeChar = ''

    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace
      openChar = '{'
      closeChar = '}'
    } else if (firstBracket !== -1) {
      startIdx = firstBracket
      openChar = '['
      closeChar = ']'
    }

    if (startIdx === -1) {
      throw new InvalidOutputError('No JSON object or array found in text', text)
    }

    let depth = 0
    let inString = false
    let escape = false
    let endIdx = -1

    for (let i = startIdx; i < cleaned.length; i++) {
      const char = cleaned[i]

      if (escape) {
        escape = false
        continue
      }

      if (char === '\\') {
        escape = true
        continue
      }

      if (char === '"') {
        inString = !inString
        continue
      }

      if (!inString) {
        if (char === openChar) {
          depth++
        } else if (char === closeChar) {
          depth--
          if (depth === 0) {
            endIdx = i
            break
          }
        }
      }
    }

    if (endIdx === -1) {
      throw new InvalidOutputError('Unbalanced JSON brackets in output', text)
    }

    const jsonSubstr = cleaned.slice(startIdx, endIdx + 1)
    try {
      return JSON.parse(jsonSubstr)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON'
      throw new InvalidOutputError(`Failed to parse extracted JSON: ${msg}`, text)
    }
  }
}
