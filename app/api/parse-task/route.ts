import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth'
import { parseTask } from '@/lib/ai'

export const maxDuration = 10

export async function POST(req: Request) {
  const { response } = await getAuthenticatedUser()
  if (response) {
    return response
  }

  try {
    const body = (await req.json()) as { prompt?: string; currentDate?: string }
    const prompt = body.prompt?.trim()

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt tugas tidak boleh kosong' },
        { status: 400 }
      )
    }

    const currentDate = body.currentDate ? new Date(body.currentDate) : new Date()
    const result = await parseTask(prompt, currentDate)

    return NextResponse.json({
      data: result.data,
      meta: {
        provider: result.provider,
        model: result.model,
        fallbackUsed: result.fallbackUsed,
        attempts: result.attempts,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Gagal memproses tugas'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
