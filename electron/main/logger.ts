import fs from 'fs'
import os from 'os'
import path from 'path'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

let cachedLogFilePath: string | null = null
let cachedLogDay: string | null = null

function getUserDataPath(): string {
  try {
    // `require` keeps this module test-friendly outside an Electron runtime.
    const electron = require('electron') as { app?: { getPath?: (name: string) => string } }
    if (electron?.app?.getPath) {
      return electron.app.getPath('userData')
    }
  } catch {
    // Ignore and fall back to a safe local folder.
  }

  return path.join(os.tmpdir(), 'openkeyboardheatmap')
}

function getLocalIsoDay(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getLogFilePathInternal(forDate: Date = new Date()): string {
  const day = getLocalIsoDay(forDate)
  if (cachedLogFilePath && cachedLogDay === day) return cachedLogFilePath

  const baseDir = getUserDataPath()
  const logsDir = path.join(baseDir, 'logs')
  fs.mkdirSync(logsDir, { recursive: true })

  cachedLogDay = day
  cachedLogFilePath = path.join(logsDir, `debug-${day}.log`)
  return cachedLogFilePath
}

function serializeMeta(meta?: unknown): string {
  if (typeof meta === 'undefined') return ''

  try {
    return ` ${JSON.stringify(meta)}`
  } catch {
    return ` ${String(meta)}`
  }
}

function writeLine(level: LogLevel, message: string, meta?: unknown): void {
  const now = new Date()
  const line = `[${now.toISOString()}] [${level}] ${message}${serializeMeta(meta)}\n`

  try {
    fs.appendFileSync(getLogFilePathInternal(now), line, 'utf-8')
  } catch (error) {
    // Last-resort fallback so log failures are still visible.
    console.error('Failed to write debug log file:', error)
    console.error(line)
  }
}

export const logger = {
  debug(message: string, meta?: unknown): void {
    writeLine('DEBUG', message, meta)
  },
  info(message: string, meta?: unknown): void {
    writeLine('INFO', message, meta)
  },
  warn(message: string, meta?: unknown): void {
    writeLine('WARN', message, meta)
  },
  error(message: string, meta?: unknown): void {
    writeLine('ERROR', message, meta)
  },
  getLogFilePath(): string {
    return getLogFilePathInternal()
  },
  getUserDataPath(): string {
    return getUserDataPath()
  },
}

export function errorToMeta(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  return { value: String(error) }
}
