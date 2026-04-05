import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addUtcDays,
  buildContributionModel,
  buildStatsSummary,
  getContributionLevel,
  getCurrentStreak,
  getDisplayLabel,
  getLongestStreak,
  getMondayIndex,
  getRollingTotal,
  parseIsoDay,
  startOfWeekMonday,
  endOfWeekMonday,
  toIsoDay,
} from '../src/app-logic'

describe('app logic date helpers', () => {
  it('formats and parses ISO days in UTC', () => {
    const date = new Date('2026-04-04T23:59:59.000Z')
    expect(toIsoDay(date)).toBe('2026-04-04')
    expect(parseIsoDay('2026-04-04').toISOString()).toBe('2026-04-04T00:00:00.000Z')
  })

  it('adds days in UTC and resolves monday-based week bounds', () => {
    const start = parseIsoDay('2026-04-04') // Saturday
    expect(toIsoDay(addUtcDays(start, 2))).toBe('2026-04-06')
    expect(getMondayIndex(start)).toBe(5)
    expect(toIsoDay(startOfWeekMonday(start))).toBe('2026-03-30')
    expect(toIsoDay(endOfWeekMonday(start))).toBe('2026-04-05')
  })
})

describe('app logic labels and levels', () => {
  it('uses Space as fixed label and falls back for empty layout labels', () => {
    expect(getDisplayLabel('  x  ', '?', 'KeyX')).toBe('X')
    expect(getDisplayLabel('   ', 'Fallback', 'KeyY')).toBe('Fallback')
    expect(getDisplayLabel(undefined, 'Fallback', 'KeyZ')).toBe('Fallback')
    expect(getDisplayLabel(' ', 'Fallback', 'Space')).toBe('Space')
  })

  it('maps contribution level boundaries as expected', () => {
    expect(getContributionLevel(0, 10)).toBe(0)
    expect(getContributionLevel(1, 0)).toBe(0)
    expect(getContributionLevel(1, 4)).toBe(1)
    expect(getContributionLevel(2, 4)).toBe(2)
    expect(getContributionLevel(3, 4)).toBe(3)
    expect(getContributionLevel(4, 4)).toBe(4)
    expect(getContributionLevel(20, 4)).toBe(4)
  })
})

describe('app logic contribution model and streaks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-04T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds a full 365-day contribution model and aggregates totals', () => {
    const model = buildContributionModel([
      { day: '2026-04-04', total: 10 },
      { day: '2026-04-03', total: 5 },
      { day: '2025-04-06', total: 7 },
    ])

    const inRangeCells = model.weeks.flat().filter((cell) => cell.inRange)
    expect(inRangeCells.length).toBe(365)
    expect(model.totalInRange).toBe(22)
    expect(model.activeInRange).toBe(3)
    expect(model.maxCount).toBe(10)
    expect(model.dayMap.get('2026-04-04')).toBe(10)
    expect(model.monthLabels.length).toBeGreaterThan(0)
  })

  it('calculates rolling totals and streaks from day maps', () => {
    const today = parseIsoDay('2026-04-04')
    const dayMap = new Map<string, number>([
      ['2026-04-04', 4],
      ['2026-04-03', 3],
      ['2026-04-01', 2],
      ['2026-03-31', 2],
      ['2026-03-30', 2],
    ])

    expect(getRollingTotal(dayMap, today, 3)).toBe(7)
    expect(getCurrentStreak(dayMap, today)).toBe(2)
    expect(getLongestStreak(dayMap)).toBe(3)
  })

  it('builds stats summary including best day and averages', () => {
    const dailyStats = [
      { day: '2026-04-04', total: 4 },
      { day: '2026-04-03', total: 3 },
      { day: '2026-04-02', total: 0 },
      { day: '2026-04-01', total: 8 },
    ]
    const dayMap = new Map<string, number>(dailyStats.map((row) => [row.day, row.total]))

    const summary = buildStatsSummary(15, dailyStats, dayMap)

    expect(summary.last7).toBe(15)
    expect(summary.last30).toBe(15)
    expect(summary.activeDays).toBe(3)
    expect(summary.average).toBe(5)
    expect(summary.currentStreak).toBe(2)
    expect(summary.longestStreak).toBe(2)
    expect(summary.bestDay).toEqual({ day: '2026-04-01', total: 8 })
  })
})
