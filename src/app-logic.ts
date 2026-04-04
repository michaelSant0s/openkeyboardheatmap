import type { DailyStat } from './global'

export interface ContributionCell {
  day: string
  count: number
  inRange: boolean
}

export interface ContributionModel {
  weeks: ContributionCell[][]
  monthLabels: Array<{ weekIndex: number; label: string }>
  maxCount: number
  totalInRange: number
  activeInRange: number
  dayMap: Map<string, number>
}

export interface StatsSummary {
  last7: number
  last30: number
  activeDays: number
  average: number
  currentStreak: number
  longestStreak: number
  bestDay: DailyStat | null
}

export const CONTRIBUTION_DAYS = 365
export const MS_PER_DAY = 24 * 60 * 60 * 1000

const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'short' })

export function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function parseIsoDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`)
}

export function addUtcDays(date: Date, days: number): Date {
  const copy = new Date(date)
  copy.setUTCDate(copy.getUTCDate() + days)
  return copy
}

export function getMondayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7
}

export function startOfWeekMonday(date: Date): Date {
  return addUtcDays(date, -getMondayIndex(date))
}

export function endOfWeekMonday(date: Date): Date {
  return addUtcDays(date, 6 - getMondayIndex(date))
}

export function getDisplayLabel(rawLabel: string | undefined, fallbackLabel: string, keyCode: string): string {
  if (keyCode === 'Space') return 'Space'
  if (!rawLabel) return fallbackLabel

  const normalized = rawLabel.trim()
  if (!normalized) return fallbackLabel
  return normalized
}

export function getContributionLevel(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0
  const ratio = count / maxCount
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

export function buildContributionModel(dailyStats: DailyStat[]): ContributionModel {
  const dayMap = new Map<string, number>()
  for (const row of dailyStats) dayMap.set(row.day, row.total)

  const today = parseIsoDay(toIsoDay(new Date()))
  const rangeStart = addUtcDays(today, -(CONTRIBUTION_DAYS - 1))
  const gridStart = startOfWeekMonday(rangeStart)
  const gridEnd = endOfWeekMonday(today)

  const cells: ContributionCell[] = []
  let totalInRange = 0
  let activeInRange = 0
  let maxCount = 0

  for (let cursor = new Date(gridStart); cursor <= gridEnd; cursor = addUtcDays(cursor, 1)) {
    const day = toIsoDay(cursor)
    const inRange = cursor >= rangeStart && cursor <= today
    const count = inRange ? (dayMap.get(day) || 0) : 0

    if (inRange) {
      totalInRange += count
      if (count > 0) activeInRange++
      if (count > maxCount) maxCount = count
    }

    cells.push({ day, count, inRange })
  }

  const weeks: ContributionCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const monthLabels: Array<{ weekIndex: number; label: string }> = []
  const seenMonths = new Set<string>()

  for (let weekIndex = 0; weekIndex < weeks.length; weekIndex++) {
    const week = weeks[weekIndex]
    const firstInRange = week.find((cell) => cell.inRange)
    if (!firstInRange) continue

    const firstDate = parseIsoDay(firstInRange.day)
    const firstMonthKey = `${firstDate.getUTCFullYear()}-${firstDate.getUTCMonth()}`
    if (weekIndex === 0 && !seenMonths.has(firstMonthKey)) {
      monthLabels.push({ weekIndex, label: monthFormatter.format(firstDate) })
      seenMonths.add(firstMonthKey)
    }

    for (const cell of week) {
      if (!cell.inRange) continue
      const date = parseIsoDay(cell.day)
      if (date.getUTCDate() !== 1) continue

      const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`
      if (seenMonths.has(monthKey)) break

      monthLabels.push({ weekIndex, label: monthFormatter.format(date) })
      seenMonths.add(monthKey)
      break
    }
  }

  return {
    weeks,
    monthLabels,
    maxCount,
    totalInRange,
    activeInRange,
    dayMap,
  }
}

export function getRollingTotal(dayMap: Map<string, number>, today: Date, days: number): number {
  let sum = 0
  for (let offset = 0; offset < days; offset++) {
    const day = toIsoDay(addUtcDays(today, -offset))
    sum += dayMap.get(day) || 0
  }
  return sum
}

export function getCurrentStreak(dayMap: Map<string, number>, today: Date): number {
  let streak = 0
  for (let cursor = new Date(today); ; cursor = addUtcDays(cursor, -1)) {
    const count = dayMap.get(toIsoDay(cursor)) || 0
    if (count <= 0) break
    streak++
  }
  return streak
}

export function getLongestStreak(dayMap: Map<string, number>): number {
  const activeDays = Array.from(dayMap.entries())
    .filter(([, count]) => count > 0)
    .map(([day]) => day)
    .sort()

  if (activeDays.length === 0) return 0

  let longest = 1
  let current = 1

  for (let i = 1; i < activeDays.length; i++) {
    const prev = parseIsoDay(activeDays[i - 1]).getTime()
    const curr = parseIsoDay(activeDays[i]).getTime()
    const diffDays = Math.round((curr - prev) / MS_PER_DAY)

    current = diffDays === 1 ? current + 1 : 1
    if (current > longest) longest = current
  }

  return longest
}

export function buildStatsSummary(total: number, dailyStats: DailyStat[], dayMap: Map<string, number>): StatsSummary {
  const activeDays = dailyStats.filter((row) => row.total > 0).length
  const average = activeDays > 0 ? Math.round(total / activeDays) : 0
  const bestDay = dailyStats.reduce<DailyStat | null>((best, row) => (!best || row.total > best.total ? row : best), null)

  const today = parseIsoDay(toIsoDay(new Date()))
  return {
    last7: getRollingTotal(dayMap, today, 7),
    last30: getRollingTotal(dayMap, today, 30),
    activeDays,
    average,
    currentStreak: getCurrentStreak(dayMap, today),
    longestStreak: getLongestStreak(dayMap),
    bestDay,
  }
}
