import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('better-sqlite3-multiple-ciphers', () => {
  type Row = { keyName: string; day: string; count: number }

  class FakeStatement {
    constructor(
      private readonly sql: string,
      private readonly storage: Map<string, number>
    ) {}

    run(keyName: string, day: string, count: number): void {
      if (!this.sql.includes('INSERT INTO keystroke_counts')) return
      const key = `${keyName}|${day}`
      this.storage.set(key, (this.storage.get(key) || 0) + count)
    }

    all(param?: string | number): Array<{ key_name?: string; day?: string; count?: number; total?: number }> {
      if (this.sql.includes('WHERE day = ?')) {
        const day = String(param)
        return this.rows().filter((row) => row.day === day).map((row) => ({
          key_name: row.keyName,
          count: row.count,
        }))
      }

      if (this.sql.includes('GROUP BY key_name')) {
        const byKey = new Map<string, number>()
        for (const row of this.rows()) {
          byKey.set(row.keyName, (byKey.get(row.keyName) || 0) + row.count)
        }
        return Array.from(byKey.entries()).map(([keyName, count]) => ({ key_name: keyName, count }))
      }

      if (this.sql.includes('GROUP BY day')) {
        const limit = typeof param === 'number' ? param : 30
        const byDay = new Map<string, number>()
        for (const row of this.rows()) {
          byDay.set(row.day, (byDay.get(row.day) || 0) + row.count)
        }
        return Array.from(byDay.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .slice(0, limit)
          .map(([day, total]) => ({ day, total }))
      }

      return []
    }

    get(): { total: number } {
      if (!this.sql.includes('SUM(count) as total')) return { total: 0 }
      let total = 0
      for (const row of this.rows()) total += row.count
      return { total }
    }

    private rows(): Row[] {
      return Array.from(this.storage.entries()).map(([composite, count]) => {
        const [keyName, day] = composite.split('|')
        return { keyName, day, count }
      })
    }
  }

  class FakeDatabase {
    private readonly storage = new Map<string, number>()

    pragma(): void {}

    exec(): void {}

    close(): void {}

    prepare(sql: string): FakeStatement {
      return new FakeStatement(sql, this.storage)
    }

    transaction<T extends (...args: any[]) => any>(fn: T): T {
      return ((...args: Parameters<T>) => fn(...args)) as T
    }
  }

  return { default: FakeDatabase }
})

import {
  closeDatabase,
  getDailyStats,
  getDatabasePaths,
  getKeyCounts,
  getTotalKeystrokes,
  incrementKeyCounts,
  initDatabase,
} from '../electron/main/database'

let testDbPath: string

beforeEach(() => {
  testDbPath = path.join(
    os.tmpdir(),
    `test-keystrokes-${Date.now()}-${Math.random().toString(36).slice(2)}.db`
  )
  initDatabase(testDbPath)
})

afterEach(() => {
  closeDatabase()
  try { fs.unlinkSync(testDbPath) } catch {}
  try { fs.unlinkSync(testDbPath + '.key') } catch {}
})

describe('database', () => {
  it('initialises and creates encryption key file', () => {
    const key = fs.readFileSync(`${testDbPath}.key`, 'utf-8').trim()
    expect(key).toMatch(/^[a-f0-9]{64}$/)
  })

  it('increments and accumulates key counts', () => {
    incrementKeyCounts(new Map([['KeyA', 5], ['KeyB', 3]]))
    incrementKeyCounts(new Map([['KeyA', 2]]))

    const result = getKeyCounts()
    expect(result['KeyA']).toBe(7)
    expect(result['KeyB']).toBe(3)
  })

  it('filters by day and computes totals', () => {
    incrementKeyCounts(new Map([['KeyA', 10], ['KeyB', 20]]))

    const today = new Date().toISOString().split('T')[0]
    expect(getKeyCounts(today)['KeyA']).toBe(10)
    expect(getTotalKeystrokes()).toBe(30)
  })

  it('normalizes legacy key names during reads', () => {
    incrementKeyCounts(new Map([['a', 2], ['KeyA', 3], ['space', 4], ['Space', 1]]))
    const result = getKeyCounts()
    expect(result['KeyA']).toBe(5)
    expect(result['Space']).toBe(5)
  })

  it('returns daily stats with safe limits', () => {
    incrementKeyCounts(new Map([['KeyA', 1]]))
    expect(getDailyStats(0).length).toBe(1)
    expect(getDailyStats(-5).length).toBe(1)
    expect(getDailyStats(30000).length).toBe(1)
    expect(getDailyStats()[0].day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('exposes resolved storage paths', () => {
    const paths = getDatabasePaths()
    expect(paths.dbPath).toBe(testDbPath)
    expect(paths.keyPath).toBe(`${testDbPath}.key`)
    expect(paths.userDataPath).toBe(path.dirname(testDbPath))
  })
})
