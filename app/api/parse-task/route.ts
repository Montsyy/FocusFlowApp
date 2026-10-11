import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/auth'

export async function POST() {
  const { response } = await getAuthenticatedUser()
  if (response) {
    return response
  }

  return NextResponse.json({ message: 'Parse task placeholder' })
}
