import { uIOhook, type UiohookKeyboardEvent } from 'uiohook-napi'
import fs from 'fs'
import { incrementKeyCounts, getKeyCounts } from './database'
import { SCAN_CODE_TO_KEY_CODE } from '../../src/keycodes'
import { toLocalIsoDay } from '../../src/date-utils'
import { logger, errorToMeta } from './logger'

let buffer: Map<string, number> = new Map()
let flushTimer: ReturnType<typeof setTimeout> | null = null
let realtimeEmitTimer: ReturnType<typeof setTimeout> | null = null
let onSnapshotCallback: ((snapshot: KeyCountsSnapshot) => void) | null = null
let hookListenerAttached = false
let uiohookRunning = false
let evdevRunning = false
let liveAllTimeCounts: Record<string, number> = {}
let liveTodayCounts: Record<string, number> = {}
let liveTotalKeystrokes = 0
let liveTodayKeystrokes = 0
let liveDayKey = ''
const loggedLinuxIntlBackslashFallbackCodes = new Set<number>()
const loggedIntlBackslashCaptureCodes = new Set<number>()
const loggedUnmappedLinuxKeyCodes = new Set<number>()
const MAX_UNMAPPED_LINUX_KEYCODE_LOGS = 25

interface EvdevStreamState {
  stream: fs.ReadStream
  remainder: Buffer
}

const evdevStreams: EvdevStreamState[] = []

const IS_64_BIT_ARCH = new Set(['x64', 'arm64', 'ppc64', 's390x', 'loong64'])
const LINUX_LONG_SIZE = IS_64_BIT_ARCH.has(process.arch) ? 8 : 4
const INPUT_EVENT_SIZE = LINUX_LONG_SIZE * 2 + 8
const INPUT_EVENT_TYPE_OFFSET = LINUX_LONG_SIZE * 2
const INPUT_EVENT_CODE_OFFSET = INPUT_EVENT_TYPE_OFFSET + 2
const INPUT_EVENT_VALUE_OFFSET = INPUT_EVENT_CODE_OFFSET + 2
const LIVE_EMIT_INTERVAL_MS = 120

export interface KeyCountsSnapshot {
  allTimeCounts: Record<string, number>
  todayCounts: Record<string, number>
  totalKeystrokes: number
  todayKeystrokes: number
}

export interface KeyloggerStartResult {
  success: boolean
  backend?: 'uiohook' | 'evdev'
  errorMessage?: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Unknown keylogger error'
}

function getTodayIsoDay(): string {
  return toLocalIsoDay(new Date())
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0)
}

function buildSnapshot(): KeyCountsSnapshot {
  return {
    allTimeCounts: { ...liveAllTimeCounts },
    todayCounts: { ...liveTodayCounts },
    totalKeystrokes: liveTotalKeystrokes,
    todayKeystrokes: liveTodayKeystrokes,
  }
}

function emitSnapshotNow(): void {
  if (!onSnapshotCallback) return
  onSnapshotCallback(buildSnapshot())
}

function scheduleRealtimeEmit(): void {
  if (realtimeEmitTimer) return

  realtimeEmitTimer = setTimeout(() => {
    realtimeEmitTimer = null
    emitSnapshotNow()
  }, LIVE_EMIT_INTERVAL_MS)
}

function incrementLiveCounters(keyName: string, count = 1): void {
  ensureLiveDayIsCurrent()
  liveAllTimeCounts[keyName] = (liveAllTimeCounts[keyName] || 0) + count
  liveTodayCounts[keyName] = (liveTodayCounts[keyName] || 0) + count
  liveTotalKeystrokes += count
  liveTodayKeystrokes += count
}

function ensureLiveDayIsCurrent(): void {
  const today = getTodayIsoDay()
  if (liveDayKey === today) return

  liveDayKey = today
  try {
    liveTodayCounts = getKeyCounts(today)
    liveTodayKeystrokes = sumCounts(liveTodayCounts)
  } catch (error) {
    logger.error('Failed to refresh live today counters after day rollover.', { error: errorToMeta(error) })
    liveTodayCounts = {}
    liveTodayKeystrokes = 0
  }
}

function initializeLiveCountersFromDatabase(): void {
  try {
    const today = getTodayIsoDay()
    liveDayKey = today
    liveAllTimeCounts = getKeyCounts()
    liveTodayCounts = getKeyCounts(today)
    liveTotalKeystrokes = sumCounts(liveAllTimeCounts)
    liveTodayKeystrokes = sumCounts(liveTodayCounts)
  } catch (error) {
    logger.error('Failed to initialize live key counters from database.', { error: errorToMeta(error) })
    liveDayKey = getTodayIsoDay()
    liveAllTimeCounts = {}
    liveTodayCounts = {}
    liveTotalKeystrokes = 0
    liveTodayKeystrokes = 0
  }
}

function incrementBuffer(keyName: string): void {
  buffer.set(keyName, (buffer.get(keyName) || 0) + 1)
  incrementLiveCounters(keyName)
  scheduleRealtimeEmit()
}

export function recordKeyByCode(keyCode: number): void {
  const keyName = SCAN_CODE_TO_KEY_CODE[keyCode]
  if (keyName) {
    incrementBuffer(keyName)

    if (keyName === 'IntlBackslash' && !loggedIntlBackslashCaptureCodes.has(keyCode)) {
      logger.info('IntlBackslash key event captured.', { keyCode })
      loggedIntlBackslashCaptureCodes.add(keyCode)
    }
    return
  }

  if (
    process.platform === 'linux'
    && !loggedUnmappedLinuxKeyCodes.has(keyCode)
    && loggedUnmappedLinuxKeyCodes.size < MAX_UNMAPPED_LINUX_KEYCODE_LOGS
  ) {
    loggedUnmappedLinuxKeyCodes.add(keyCode)
    logger.warn('Unmapped Linux keycode observed; key press ignored.', { keyCode })
  }
}

function onKeydown(event: UiohookKeyboardEvent): void {
  // Linux/X11 quirks in libuiohook: the ISO 102ND key ("<", ">", "|") can
  // show up as one of these values depending on stack/session.
  const linuxIntlBackslashFallbackCodes = new Set([94, 226])
  const mappedKey = SCAN_CODE_TO_KEY_CODE[event.keycode]
  if (
    process.platform === 'linux'
    && linuxIntlBackslashFallbackCodes.has(event.keycode)
    && mappedKey !== 'IntlBackslash'
  ) {
    incrementBuffer('IntlBackslash')
    if (!loggedLinuxIntlBackslashFallbackCodes.has(event.keycode)) {
      logger.info('Applied Linux IntlBackslash compatibility fallback for uIOhook.', {
        keyCode: event.keycode,
        mappedAs: 'IntlBackslash',
      })
      loggedLinuxIntlBackslashFallbackCodes.add(event.keycode)
    }
  }

  recordKeyByCode(event.keycode)
}

function shouldPreferLinuxEvdev(): { preferred: boolean; reason: string } {
  if (process.platform !== 'linux') {
    return { preferred: false, reason: 'non-linux-platform' }
  }

  const override = (process.env.OKH_KEYLOGGER_BACKEND || '').toLowerCase().trim()
  if (override === 'uiohook') {
    return { preferred: false, reason: 'env-override-uiohook' }
  }
  if (override === 'evdev') {
    return { preferred: true, reason: 'env-override-evdev' }
  }

  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0
  if (isRoot) {
    return { preferred: true, reason: 'linux-root-prefers-evdev' }
  }

  return { preferred: false, reason: 'default-uiohook' }
}

function attachHookListener(): void {
  if (hookListenerAttached) return
  uIOhook.on('keydown', onKeydown)
  hookListenerAttached = true
}

function detachHookListener(): void {
  if (!hookListenerAttached) return
  uIOhook.removeListener('keydown', onKeydown)
  hookListenerAttached = false
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer)
  // Security: random interval 5–30 s so timing analysis is impossible
  const delay = 5000 + Math.floor(Math.random() * 25000)
  flushTimer = setTimeout(flushBuffer, delay)
}

function flushBuffer(): void {
  try {
    if (buffer.size === 0) {
      scheduleFlush()
      return
    }

    const toFlush = new Map(buffer)
    buffer.clear()

    try {
      incrementKeyCounts(toFlush)
    } catch (error) {
      // Keep pending increments in memory so a later flush can retry.
      for (const [keyName, count] of toFlush) {
        buffer.set(keyName, (buffer.get(keyName) || 0) + count)
      }
      throw error
    }

    emitSnapshotNow()
  } catch (error) {
    logger.error('Keylogger buffer flush failed.', {
      bufferSize: buffer.size,
      error: errorToMeta(error),
    })
  }

  scheduleFlush()
}

function readLinuxKeyboardDevicePaths(): string[] {
  const unique = new Set<string>()

  const symlinkDirs = ['/dev/input/by-path', '/dev/input/by-id']
  for (const dir of symlinkDirs) {
    if (!fs.existsSync(dir)) continue
    let entries: string[]
    try {
      entries = fs.readdirSync(dir)
    } catch (error) {
      logger.warn('Failed to read Linux keyboard symlink directory.', {
        dir,
        error: errorToMeta(error),
      })
      continue
    }
    for (const entry of entries) {
      if (!entry.endsWith('-event-kbd')) continue
      const symlinkPath = `${dir}/${entry}`
      try {
        unique.add(fs.realpathSync(symlinkPath))
      } catch (error) {
        logger.warn('Failed to resolve Linux keyboard symlink.', {
          symlinkPath,
          error: errorToMeta(error),
        })
      }
    }
  }

  // Fallback: include /dev/input/event* if no keyboard symlinks were found.
  if (unique.size === 0 && fs.existsSync('/dev/input')) {
    try {
      for (const entry of fs.readdirSync('/dev/input')) {
        if (/^event\d+$/.test(entry)) {
          unique.add(`/dev/input/${entry}`)
        }
      }
    } catch (error) {
      logger.warn('Failed to list /dev/input fallback devices.', {
        error: errorToMeta(error),
      })
    }
  }

  return Array.from(unique)
}

function handleEvdevChunk(state: EvdevStreamState, chunk: Buffer): void {
  let data = chunk
  if (state.remainder.length > 0) {
    data = Buffer.concat([state.remainder, chunk])
    state.remainder = Buffer.alloc(0)
  }

  let offset = 0
  while (data.length - offset >= INPUT_EVENT_SIZE) {
    const type = data.readUInt16LE(offset + INPUT_EVENT_TYPE_OFFSET)
    const code = data.readUInt16LE(offset + INPUT_EVENT_CODE_OFFSET)
    const value = data.readInt32LE(offset + INPUT_EVENT_VALUE_OFFSET)

    // EV_KEY (1): value 1 = keydown, 2 = autorepeat.
    if (type === 1 && (value === 1 || value === 2)) {
      recordKeyByCode(code)
    }

    offset += INPUT_EVENT_SIZE
  }

  if (offset < data.length) {
    state.remainder = data.subarray(offset)
  }
}

function startLinuxEvdevCapture(): KeyloggerStartResult {
  const devicePaths = readLinuxKeyboardDevicePaths()
  logger.info('Attempting Linux evdev capture backend.', { deviceCount: devicePaths.length })
  if (devicePaths.length === 0) {
    logger.error('No Linux input devices found for evdev capture.')
    return {
      success: false,
      errorMessage: 'No Linux input devices found under /dev/input.',
    }
  }

  const openErrors: string[] = []

  for (const path of devicePaths) {
    try {
      const fd = fs.openSync(path, 'r')
      fs.closeSync(fd)
    } catch (error) {
      logger.warn('Keyboard device could not be opened for read access.', {
        path,
        error: errorToMeta(error),
      })
      openErrors.push(`${path}: ${getErrorMessage(error)}`)
      continue
    }

    const stream = fs.createReadStream(path, { flags: 'r' })
    const state: EvdevStreamState = {
      stream,
      remainder: Buffer.alloc(0),
    }

    stream.on('data', (chunk: Buffer) => handleEvdevChunk(state, chunk))
    stream.on('error', (error) => {
      logger.error('evdev stream error.', { path, error: errorToMeta(error) })
    })

    evdevStreams.push(state)
  }

  if (evdevStreams.length === 0) {
    const permissionDenied = openErrors.some((entry) => entry.includes('EACCES') || entry.includes('EPERM'))
    const permissionHint = permissionDenied
      ? 'Permission denied on /dev/input.'
      : 'Linux input devices are inaccessible.'
    logger.error('evdev capture failed to open any readable keyboard device.', {
      permissionDenied,
      openErrors,
    })
    return {
      success: false,
      errorMessage:
        `${permissionHint} ${openErrors.slice(0, 3).join(' | ')}`.trim(),
    }
  }

  evdevRunning = true
  logger.info('Linux evdev capture started.', { streamCount: evdevStreams.length })
  return { success: true, backend: 'evdev' }
}

export function startKeylogger(
  onSnapshot: (snapshot: KeyCountsSnapshot) => void
): KeyloggerStartResult {
  logger.info('Starting keylogger.')
  onSnapshotCallback = onSnapshot
  initializeLiveCountersFromDatabase()
  emitSnapshotNow()

  const evdevPreference = shouldPreferLinuxEvdev()
  if (evdevPreference.preferred) {
    logger.info('Trying evdev backend first.', { reason: evdevPreference.reason })
    const evdevResult = startLinuxEvdevCapture()
    if (evdevResult.success) {
      scheduleFlush()
      return evdevResult
    }
    logger.warn('Preferred evdev backend failed; falling back to uIOhook.', {
      reason: evdevPreference.reason,
      errorMessage: evdevResult.errorMessage || null,
    })
  }

  attachHookListener()

  try {
    uIOhook.start()
    uiohookRunning = true
    scheduleFlush()
    logger.info('uIOhook keylogger backend started.')
    return { success: true, backend: 'uiohook' }
  } catch (error) {
    detachHookListener()
    uiohookRunning = false
    logger.error('uIOhook failed to start.', { error: errorToMeta(error) })

    if (process.platform === 'linux') {
      const evdevResult = startLinuxEvdevCapture()
      if (evdevResult.success) {
        scheduleFlush()
        return evdevResult
      }

      return {
        success: false,
        errorMessage:
          `uIOhook failed (${getErrorMessage(error)}). ${evdevResult.errorMessage || ''}`.trim(),
      }
    }

    return {
      success: false,
      errorMessage: getErrorMessage(error),
    }
  }
}

export function stopKeylogger(): void {
  logger.info('Stopping keylogger.')
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = null
  if (realtimeEmitTimer) clearTimeout(realtimeEmitTimer)
  realtimeEmitTimer = null
  // Flush remaining buffer before exit
  if (buffer.size > 0) {
    try {
      const toFlush = new Map(buffer)
      buffer.clear()
      incrementKeyCounts(toFlush)
    } catch (error) {
      logger.error('Failed to flush keylogger buffer during shutdown.', {
        error: errorToMeta(error),
      })
    }
  }
  if (uiohookRunning) {
    detachHookListener()
    try {
      uIOhook.stop()
    } catch (error) {
      logger.warn('uIOhook stop raised an error.', { error: errorToMeta(error) })
    }
    uiohookRunning = false
  } else {
    detachHookListener()
  }

  if (evdevRunning) {
    while (evdevStreams.length > 0) {
      const state = evdevStreams.pop()!
      state.stream.removeAllListeners('data')
      state.stream.removeAllListeners('error')
      state.stream.destroy()
    }
    evdevRunning = false
  }
  onSnapshotCallback = null
  logger.info('Keylogger stopped.')
}
