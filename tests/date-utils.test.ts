import { describe, expect, it } from 'vitest'
import { toLocalIsoDay } from '../src/date-utils'

describe('date utils', () => {
  it('formats local calendar dates as YYYY-MM-DD', () => {
    const date = new Date(2026, 3, 5, 0, 30, 45, 123)
    expect(toLocalIsoDay(date)).toBe('2026-04-05')
  })
})
