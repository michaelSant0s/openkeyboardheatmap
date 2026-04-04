import fs from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'
import { errorToMeta, logger } from '../electron/main/logger'

describe('logger', () => {
  it('serializes Error instances to structured metadata', () => {
    const error = new Error('boom')
    const meta = errorToMeta(error)

    expect(meta.name).toBe('Error')
    expect(meta.message).toBe('boom')
    expect(typeof meta.stack).toBe('string')
  })

  it('serializes non-error values safely', () => {
    expect(errorToMeta(42)).toEqual({ value: '42' })
    expect(errorToMeta(null)).toEqual({ value: 'null' })
  })

  it('writes log lines to a daily log file', () => {
    const marker = `unit-log-${Date.now()}`
    logger.info(marker, { source: 'vitest' })

    const logPath = logger.getLogFilePath()
    const content = fs.readFileSync(logPath, 'utf-8')

    expect(path.basename(logPath)).toMatch(/^debug-\d{4}-\d{2}-\d{2}\.log$/)
    expect(content).toContain(`[INFO] ${marker}`)
    expect(content).toContain('"source":"vitest"')
  })
})
