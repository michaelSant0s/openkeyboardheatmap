import { beforeEach, describe, expect, it, vi } from 'vitest'

const exposeInMainWorld = vi.fn()
const invoke = vi.fn()
const on = vi.fn()
const removeListener = vi.fn()

vi.mock('electron', () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: { invoke, on, removeListener },
}))

describe('preload bridge', () => {
  beforeEach(() => {
    vi.resetModules()
    exposeInMainWorld.mockReset()
    invoke.mockReset()
    on.mockReset()
    removeListener.mockReset()
    invoke.mockResolvedValue(true)
  })

  it('exposes a renderer API and forwards invoke calls', async () => {
    await import('../electron/preload/preload')

    expect(exposeInMainWorld).toHaveBeenCalledOnce()
    expect(exposeInMainWorld.mock.calls[0][0]).toBe('api')
    const api = exposeInMainWorld.mock.calls[0][1] as Record<string, (...args: any[]) => any>

    await api.getKeyCounts('2026-04-04')
    await api.getTotalKeystrokes()
    await api.getDailyStats(100)
    await api.openExternalUrl('https://buymeacoffee.com/michaelsant0s')
    await api.windowClose()

    expect(invoke).toHaveBeenCalledWith('get-key-counts', '2026-04-04')
    expect(invoke).toHaveBeenCalledWith('get-total-keystrokes')
    expect(invoke).toHaveBeenCalledWith('get-daily-stats', 100)
    expect(invoke).toHaveBeenCalledWith('open-external-url', 'https://buymeacoffee.com/michaelsant0s')
    expect(invoke).toHaveBeenCalledWith('window-close')
  })

  it('registers and unregisters event listeners', async () => {
    await import('../electron/preload/preload')
    const api = exposeInMainWorld.mock.calls[0][1] as Record<string, (...args: any[]) => any>

    const callback = vi.fn()
    const unsubscribe = api.onKeyCountsUpdated(callback)

    expect(on).toHaveBeenCalledWith('key-counts-updated', expect.any(Function))

    const listener = on.mock.calls[0][1]
    const sample = { totalKeystrokes: 7 }
    listener({}, sample)
    expect(callback).toHaveBeenCalledWith(sample)

    unsubscribe()
    expect(removeListener).toHaveBeenCalledWith('key-counts-updated', listener)
  })
})
