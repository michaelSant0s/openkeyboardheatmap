import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { uIOhook } from 'uiohook-napi'

const incrementKeyCounts = vi.fn()
const getKeyCounts = vi.fn(() => ({}))

const logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

vi.mock('../electron/main/database', () => ({
  incrementKeyCounts,
  getKeyCounts,
}))

vi.mock('../electron/main/logger', () => ({
  logger,
  errorToMeta: vi.fn((error: unknown) => ({ value: String(error) })),
}))

vi.mock('uiohook-napi', () => ({
  uIOhook: {
    on: vi.fn(),
    removeListener: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  },
}))

describe('keylogger', () => {
  let keylogger: typeof import('../electron/main/keylogger')

  beforeEach(async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-04T12:00:00.000Z'))
    vi.resetModules()
    vi.clearAllMocks()
    getKeyCounts.mockImplementation(() => ({}))
    keylogger = await import('../electron/main/keylogger')
  })

  afterEach(() => {
    keylogger.stopKeylogger()
    vi.useRealTimers()
  })

  it('records mapped keys, emits snapshots and flushes buffer', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const snapshots: Array<{ totalKeystrokes: number; allTimeCounts: Record<string, number> }> = []

    const start = keylogger.startKeylogger((snapshot) => {
      snapshots.push(snapshot)
    })

    expect(start.success).toBe(true)
    expect(start.backend).toBe('uiohook')
    expect(snapshots.at(-1)?.totalKeystrokes).toBe(0)

    keylogger.recordKeyByCode(0xe048) // ArrowUp

    vi.advanceTimersByTime(120)
    expect(snapshots.at(-1)?.allTimeCounts['ArrowUp']).toBe(1)
    expect(snapshots.at(-1)?.totalKeystrokes).toBe(1)

    vi.advanceTimersByTime(5000)
    expect(incrementKeyCounts).toHaveBeenCalledTimes(1)
    const flushedMap = incrementKeyCounts.mock.calls[0][0] as Map<string, number>
    expect(flushedMap.get('ArrowUp')).toBe(1)

    randomSpy.mockRestore()
  })

  it('counts repeated keydown events only once until keyup', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const snapshots: Array<{ allTimeCounts: Record<string, number> }> = []

    keylogger.startKeylogger((snapshot) => {
      snapshots.push(snapshot)
    })

    const onMock = uIOhook.on as unknown as { mock: { calls: any[][] } }
    const keydownListener = onMock.mock.calls.find((call) => call[0] === 'keydown')?.[1] as
      | ((event: { keycode: number }) => void)
      | undefined
    const keyupListener = onMock.mock.calls.find((call) => call[0] === 'keyup')?.[1] as
      | ((event: { keycode: number }) => void)
      | undefined

    expect(typeof keydownListener).toBe('function')
    expect(typeof keyupListener).toBe('function')

    keydownListener!({ keycode: 0x1e }) // KeyA
    keydownListener!({ keycode: 0x1e }) // autorepeat
    keydownListener!({ keycode: 0x1e }) // autorepeat

    vi.advanceTimersByTime(120)
    expect(snapshots.at(-1)?.allTimeCounts['KeyA']).toBe(1)

    keyupListener!({ keycode: 0x1e })
    keydownListener!({ keycode: 0x1e })

    vi.advanceTimersByTime(120)
    expect(snapshots.at(-1)?.allTimeCounts['KeyA']).toBe(2)

    vi.advanceTimersByTime(5000)
    expect(incrementKeyCounts).toHaveBeenCalledTimes(1)
    const flushedMap = incrementKeyCounts.mock.calls[0][0] as Map<string, number>
    expect(flushedMap.get('KeyA')).toBe(2)

    randomSpy.mockRestore()
  })

  it('ignores unknown scan codes', () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    keylogger.startKeylogger(() => {})
    keylogger.recordKeyByCode(999999)

    vi.advanceTimersByTime(5000)
    expect(incrementKeyCounts).not.toHaveBeenCalled()

    randomSpy.mockRestore()
  })

  it('preserves NumpadAdd on Linux for keycode 0x4e', () => {
    if (process.platform !== 'linux') return

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const snapshots: Array<{ allTimeCounts: Record<string, number> }> = []

    keylogger.startKeylogger((snapshot) => {
      snapshots.push(snapshot)
    })

    const onMock = uIOhook.on as unknown as { mock: { calls: any[][] } }
    const keydownListener = onMock.mock.calls.find((call) => call[0] === 'keydown')?.[1] as
      | ((event: { keycode: number }) => void)
      | undefined

    expect(typeof keydownListener).toBe('function')
    keydownListener!({ keycode: 0x4e })

    vi.advanceTimersByTime(120)
    expect(snapshots.at(-1)?.allTimeCounts['NumpadAdd']).toBe(1)

    randomSpy.mockRestore()
  })

  it('applies Linux compatibility fallback for alternate IntlBackslash keycodes', () => {
    if (process.platform !== 'linux') return

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const snapshots: Array<{ allTimeCounts: Record<string, number> }> = []

    keylogger.startKeylogger((snapshot) => {
      snapshots.push(snapshot)
    })

    const onMock = uIOhook.on as unknown as { mock: { calls: any[][] } }
    const keydownListener = onMock.mock.calls.find((call) => call[0] === 'keydown')?.[1] as
      | ((event: { keycode: number }) => void)
      | undefined

    expect(typeof keydownListener).toBe('function')
    keydownListener!({ keycode: 94 })

    vi.advanceTimersByTime(120)
    expect(snapshots.at(-1)?.allTimeCounts['IntlBackslash']).toBe(1)

    randomSpy.mockRestore()
  })

  it('maps uiohook keyCode 0 (VC_UNDEFINED) to IntlBackslash on Linux', () => {
    if (process.platform !== 'linux') return

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const snapshots: Array<{ allTimeCounts: Record<string, number> }> = []

    keylogger.startKeylogger((snapshot) => {
      snapshots.push(snapshot)
    })

    // libuiohook maps X11 keycode 94 (ISO <> key, KEY_102ND) to VC_UNDEFINED = 0.
    // The app must recognise keyCode 0 as IntlBackslash on Linux.
    keylogger.recordKeyByCode(0)

    vi.advanceTimersByTime(120)
    expect(snapshots.at(-1)?.allTimeCounts['IntlBackslash']).toBe(1)

    randomSpy.mockRestore()
  })

  it('handles Linux IntlBackslash keyup/keydown code variants without getting stuck', () => {
    if (process.platform !== 'linux') return

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)
    const snapshots: Array<{ allTimeCounts: Record<string, number> }> = []

    keylogger.startKeylogger((snapshot) => {
      snapshots.push(snapshot)
    })

    const onMock = uIOhook.on as unknown as { mock: { calls: any[][] } }
    const keydownListener = onMock.mock.calls.find((call) => call[0] === 'keydown')?.[1] as
      | ((event: { keycode: number }) => void)
      | undefined
    const keyupListener = onMock.mock.calls.find((call) => call[0] === 'keyup')?.[1] as
      | ((event: { keycode: number }) => void)
      | undefined

    expect(typeof keydownListener).toBe('function')
    expect(typeof keyupListener).toBe('function')

    // Some Linux stacks can report ISO-102ND keydown/keyup with different code variants.
    keydownListener!({ keycode: 0x0e56 })
    keyupListener!({ keycode: 0x56 })
    keydownListener!({ keycode: 0x56 })

    vi.advanceTimersByTime(120)
    expect(snapshots.at(-1)?.allTimeCounts['IntlBackslash']).toBe(2)

    randomSpy.mockRestore()
  })
})
