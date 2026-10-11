import { describe, expect, it } from 'vitest'
import { schedule } from './index'

describe('scheduler', () => {
  it('returns an empty array as placeholder', () => {
    expect(schedule()).toEqual([])
  })
})
