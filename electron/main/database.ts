import Database from 'better-sqlite3-multiple-ciphers'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { normalizeStoredKeyName } from '../../src/keycodes'
import { logger, errorToMeta } from './logger'

let db: Database.Database | null = null
let currentDbPath: string | null = null

export interface DatabasePaths {
  dbPath: string
  keyPath: string
  userDataPath: string
}

/**
 * Initialise the encrypted SQLite database.
 * A random encryption key is generated once and stored next to the database.
 * If someone steals only the .db file they cannot decrypt it.
 */
export function initDatabase(dbPath?: string): void {
  const finalPath = dbPath || getDefaultDbPath()
  const keyPath = finalPath + '.key'

  try {
    if (db) {
      db.close()
      db = null
    }

    // Generate or read encryption key
    let encryptionKey: string
    if (fs.existsSync(keyPath)) {
      encryptionKey = fs.readFileSync(keyPath, 'utf-8').trim()
    } else {
      encryptionKey = crypto.randomBytes(32).toString('hex')
      fs.mkdirSync(path.dirname(keyPath), { recursive: true })
      fs.writeFileSync(keyPath, encryptionKey, { mode: 0o600 })
    }

    db = new Database(finalPath)
    db.pragma(`key='${encryptionKey}'`)
    db.pragma('journal_mode = WAL')

    db.exec(`
      CREATE TABLE IF NOT EXISTS keystroke_counts (
        key_name TEXT NOT NULL,
        day TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (key_name, day)
      )
    `)

    currentDbPath = finalPath
    logger.info('Database initialized.', { dbPath: finalPath })
  } catch (error) {
    logger.error('Database initialization failed.', {
      dbPath: finalPath,
      keyPath,
      error: errorToMeta(error),
    })
    throw error
  }
}

function getDefaultDbPath(): string {
  const { app } = require('electron')
  return path.join(app.getPath('userData'), 'keystrokes.db')
}

function requireDb(): Database.Database {
  if (!db) {
    const error = new Error('Database is not initialized.')
    logger.error('Database operation attempted before init.', { error: errorToMeta(error) })
    throw error
  }

  return db
}

export function getDatabasePaths(): DatabasePaths {
  const resolvedDbPath = currentDbPath || getDefaultDbPath()

  return {
    dbPath: resolvedDbPath,
    keyPath: `${resolvedDbPath}.key`,
    userDataPath: path.dirname(resolvedDbPath),
  }
}

/**
 * Flush buffered key counts to the database.
 * Security: inserts are shuffled (Fisher-Yates) so write-order
 * cannot reveal the original keystroke sequence.
 * Only the date (YYYY-MM-DD) is stored — no time-of-day.
 */
export function incrementKeyCounts(counts: Map<string, number>): void {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD only

  try {
    const instance = requireDb()
    const entries = Array.from(counts.entries())
    shuffleArray(entries)

    const stmt = instance.prepare(`
      INSERT INTO keystroke_counts (key_name, day, count)
      VALUES (?, ?, ?)
      ON CONFLICT(key_name, day) DO UPDATE SET count = count + excluded.count
    `)

    const transaction = instance.transaction(() => {
      for (const [key, count] of entries) {
        stmt.run(key, today, count)
      }
    })

    transaction()
  } catch (error) {
    logger.error('Failed to increment key counts.', {
      day: today,
      entryCount: counts.size,
      error: errorToMeta(error),
    })
    throw error
  }
}

export function getKeyCounts(day?: string): Record<string, number> {
  try {
    const instance = requireDb()

    let rows: Array<{ key_name: string; count: number }>
    if (day) {
      rows = instance.prepare('SELECT key_name, count FROM keystroke_counts WHERE day = ?').all(day) as any[]
    } else {
      rows = instance.prepare('SELECT key_name, SUM(count) as count FROM keystroke_counts GROUP BY key_name').all() as any[]
    }

    const result: Record<string, number> = {}
    for (const row of rows) {
      const normalizedKey = normalizeStoredKeyName(row.key_name)
      result[normalizedKey] = (result[normalizedKey] || 0) + row.count
    }

    return result
  } catch (error) {
    logger.error('Failed to fetch key counts.', {
      day: day || null,
      error: errorToMeta(error),
    })
    throw error
  }
}

export function getTotalKeystrokes(): number {
  try {
    const instance = requireDb()
    const row = instance.prepare('SELECT SUM(count) as total FROM keystroke_counts').get() as any
    return row?.total || 0
  } catch (error) {
    logger.error('Failed to fetch total keystrokes.', { error: errorToMeta(error) })
    throw error
  }
}

export function getDailyStats(limit = 30): Array<{ day: string; total: number }> {
  const safeLimit = Number.isInteger(limit)
    ? Math.min(Math.max(limit, 1), 20000)
    : 30

  try {
    const instance = requireDb()

    return instance.prepare(
      'SELECT day, SUM(count) as total FROM keystroke_counts GROUP BY day ORDER BY day DESC LIMIT ?'
    ).all(safeLimit) as any[]
  } catch (error) {
    logger.error('Failed to fetch daily stats.', {
      limit: safeLimit,
      error: errorToMeta(error),
    })
    throw error
  }
}

export function closeDatabase(): void {
  if (!db) return

  try {
    try {
      db.pragma('wal_checkpoint(TRUNCATE)')
    } catch (error) {
      logger.warn('WAL checkpoint before close failed.', { error: errorToMeta(error) })
    }

    db.close()
    db = null
    logger.info('Database closed.')
  } catch (error) {
    logger.error('Failed to close database cleanly.', { error: errorToMeta(error) })
    throw error
  }
}

/** Fisher-Yates shuffle — used to randomize DB insert order for security */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}
