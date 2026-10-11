import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth'
import { reflectWeek, type ReflectWeekContext } from '@/lib/ai'

export const maxDuration = 10

export async function POST(req: Request) {
  const { response } = await getAuthenticatedUser()
  if (response) {
    return response
  }

  try {
    const body = (await req.json()) as ReflectWeekContext
    const result = await reflectWeek(body)

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
    const msg = err instanceof Error ? err.message : 'Gagal menghasilkan refleksi'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
