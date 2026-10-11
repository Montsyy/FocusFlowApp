import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth'

export async function GET() {
  const { response } = await getAuthenticatedUser()
  if (response) {
    return response
  }

  return NextResponse.json({ ok: true })
}
