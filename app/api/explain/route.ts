import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth'
import { explainBlock, type ExplainBlockContext } from '@/lib/ai'

export const maxDuration = 10

export async function POST(req: Request) {
  const { response } = await getAuthenticatedUser()
  if (response) {
    return response
  }

  try {
    const body = (await req.json()) as ExplainBlockContext
    const result = await explainBlock(body)

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
    const msg = err instanceof Error ? err.message : 'Gagal membuat penjelasan'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
