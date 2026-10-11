import { describe, expect, it } from 'vitest'
import { createClient as createBrowserClient } from './client'
import { createClient as createServerClient } from './server'

describe('Supabase clients initialization', () => {
  it('creates browser client instance without throwing', () => {
    const client = createBrowserClient()
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })

  it('creates server client function without throwing', () => {
    expect(typeof createServerClient).toBe('function')
  })
})
