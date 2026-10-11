import { NextResponse } from 'next/server'
import { createServerClient } from './server'
import type { User } from '@supabase/supabase-js'

export class AuthError extends Error {
  status: number
  constructor(message = 'Akses ditolak: pengguna belum masuk', status = 401) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

export async function getUserOrThrow(): Promise<User> {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AuthError('Akses ditolak: pengguna belum masuk', 401)
  }

  return user
}

export async function getAuthenticatedUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Akses ditolak: pengguna belum masuk' },
        { status: 401 }
      ),
      supabase,
    }
  }

  return { user, response: null, supabase }
}
