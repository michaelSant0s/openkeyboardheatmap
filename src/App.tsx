import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ActionResult, CaptureStatus, DailyStat, KeyCountsSnapshot, StorageInfo, WindowStatePayload } from './global'
import { KEYBOARD_ROWS, getHeatmapColor } from './keyboard-layout'
import {
  buildContributionModel,
  buildStatsSummary,
  getContributionLevel,
  getDisplayLabel,
  parseIsoDay,
  toIsoDay,
} from './app-logic'
import btcQrImage from './assets/btc-qr.png'
import dogeQrImage from './assets/doge-qr.png'
import './style.css'

type ViewMode = 'all' | 'today'
type ActiveTab = 'keyboard' | 'stats' | 'settings' | 'support'

interface KeyboardLayoutMapLike {
  get: (code: string) => string | undefined
}

interface KeyboardApiLike {
  getLayoutMap?: () => Promise<KeyboardLayoutMapLike>
  addEventListener?: (type: 'layoutchange', listener: () => void) => void
  removeEventListener?: (type: 'layoutchange', listener: () => void) => void
}

interface NavigatorWithKeyboard extends Navigator {
  keyboard?: KeyboardApiLike
}

const KEY_WIDTH = 44
const KEY_GAP = 6
const DAILY_STATS_LIMIT = 5000
const LIVE_STATS_REFRESH_DELAY_MS = 3000
const BTC_ADDRESS = 'bc1q273jxf4xq87qggcjfw6d8v038rwqyygcsxmw8f'
const DOGE_ADDRESS = 'DASGta7VgHuxUCvDh9v5cfRCFLirjs611B'
const COFFEE_URL = 'https://buymeacoffee.com/michaelsant0s'
const GERMAN_QWERTZ_LABEL_OVERRIDES: Record<string, string> = {
  Backquote: '^',
  KeyY: 'Z',
  KeyZ: 'Y',
  Minus: 'ß',
  Equal: '´',
  BracketLeft: 'Ü',
  BracketRight: '+',
  Backslash: '#',
  Semicolon: 'Ö',
  Quote: 'Ä',
  Slash: '-',
  IntlBackslash: '<',
}

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

const EMPTY_SNAPSHOT: KeyCountsSnapshot = {
  allTimeCounts: {},
  todayCounts: {},
  totalKeystrokes: 0,
  todayKeystrokes: 0,
}

function getLocaleFallbackLayoutLabels(locale: string): Record<string, string> {
  const normalized = (locale || '').toLowerCase()
  if (normalized.startsWith('de')) return GERMAN_QWERTZ_LABEL_OVERRIDES
  return {}
}

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()

  if (!copied) throw new Error('Clipboard copy command failed.')
}

export function App(): JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>('keyboard')
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [snapshot, setSnapshot] = useState<KeyCountsSnapshot>(EMPTY_SNAPSHOT)
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>({ mode: 'global', message: '' })
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [settingsStatus, setSettingsStatus] = useState<{ message: string; isError: boolean } | null>(null)
  const [layoutLabels, setLayoutLabels] = useState<Record<string, string>>({})
  const [windowState, setWindowState] = useState<WindowStatePayload>({ isMaximized: false })
  const [btcCopyLabel, setBtcCopyLabel] = useState('Copy')
  const [dogeCopyLabel, setDogeCopyLabel] = useState('Copy')

  const statsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const btcLabelResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dogeLabelResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const logRenderer = useCallback(async (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    meta?: unknown
  ): Promise<void> => {
    try {
      await window.api.logRenderer(level, message, meta)
    } catch {
      // Avoid recursive logging failures.
    }
  }, [])

  const refreshStorageInfo = useCallback(async (): Promise<void> => {
    try {
      setStorageInfo(await window.api.getStorageInfo())
    } catch (error) {
      await logRenderer('error', 'Could not load storage info.', { error: String(error) })
    }
  }, [logRenderer])

  const refreshStatsPanels = useCallback(async (): Promise<void> => {
    try {
      const [total, stats] = await Promise.all([
        window.api.getTotalKeystrokes(),
        window.api.getDailyStats(DAILY_STATS_LIMIT),
      ])

      setDailyStats(stats)
      setSnapshot((prev) => (prev.totalKeystrokes === total ? prev : {
        ...prev,
        totalKeystrokes: total,
      }))
    } catch (error) {
      await logRenderer('error', 'Failed to refresh stats panels.', { error: String(error) })
    }
  }, [logRenderer])

  const scheduleStatsPanelRefresh = useCallback((): void => {
    if (statsRefreshTimerRef.current) return

    statsRefreshTimerRef.current = setTimeout(() => {
      statsRefreshTimerRef.current = null
      void refreshStatsPanels()
    }, LIVE_STATS_REFRESH_DELAY_MS)
  }, [refreshStatsPanels])

  const refreshAllData = useCallback(async (): Promise<void> => {
    try {
      const today = toIsoDay(new Date())
      const [allTimeCounts, todayCounts, total, stats] = await Promise.all([
        window.api.getKeyCounts(),
        window.api.getKeyCounts(today),
        window.api.getTotalKeystrokes(),
        window.api.getDailyStats(DAILY_STATS_LIMIT),
      ])

      setSnapshot({
        allTimeCounts,
        todayCounts,
        totalKeystrokes: total,
        todayKeystrokes: Object.values(todayCounts).reduce((sum, value) => sum + value, 0),
      })
      setDailyStats(stats)
    } catch (error) {
      await logRenderer('error', 'Failed to refresh all renderer data.', { error: String(error) })
      setSettingsStatus({ message: 'Could not refresh data. See debug.log for details.', isError: true })
    }
  }, [logRenderer])

  useEffect(() => {
    void refreshAllData()
    void refreshStorageInfo()

    window.api.getCaptureStatus()
      .then(setCaptureStatus)
      .catch((error) => { void logRenderer('error', 'Failed to fetch capture status.', { error: String(error) }) })

    window.api.getWindowState()
      .then(setWindowState)
      .catch((error) => { void logRenderer('warn', 'Failed to fetch initial window state.', { error: String(error) }) })

    const removeKeyCounts = window.api.onKeyCountsUpdated((nextSnapshot) => {
      setSnapshot(nextSnapshot)
      scheduleStatsPanelRefresh()
    })
    const removeCaptureStatus = window.api.onCaptureStatusUpdated(setCaptureStatus)
    const removeWindowState = window.api.onWindowStateUpdated(setWindowState)

    return () => {
      removeKeyCounts()
      removeCaptureStatus()
      removeWindowState()
      if (statsRefreshTimerRef.current) clearTimeout(statsRefreshTimerRef.current)
      if (btcLabelResetTimerRef.current) clearTimeout(btcLabelResetTimerRef.current)
      if (dogeLabelResetTimerRef.current) clearTimeout(dogeLabelResetTimerRef.current)
    }
  }, [logRenderer, refreshAllData, refreshStorageInfo, scheduleStatsPanelRefresh])

  useEffect(() => {
    const keyboardApi = (navigator as NavigatorWithKeyboard).keyboard
    const localeFallbackLabels = getLocaleFallbackLayoutLabels(navigator.language || '')
    if (!keyboardApi?.getLayoutMap) {
      if (Object.keys(localeFallbackLabels).length > 0) {
        setLayoutLabels(localeFallbackLabels)
      }
      return
    }

    const applyLayoutLabels = async (): Promise<void> => {
      try {
        const map = await keyboardApi.getLayoutMap!()
        const nextLabels: Record<string, string> = {}
        for (const row of KEYBOARD_ROWS) {
          for (const key of row) {
            const label = map.get(key.keyCode)
            if (label) nextLabels[key.keyCode] = label
          }
        }
        setLayoutLabels({ ...localeFallbackLabels, ...nextLabels })
      } catch (error) {
        if (Object.keys(localeFallbackLabels).length > 0) {
          setLayoutLabels(localeFallbackLabels)
        }
        await logRenderer('warn', 'Could not read keyboard layout map.', { error: String(error) })
      }
    }

    void applyLayoutLabels()
    const onLayoutChange = (): void => { void applyLayoutLabels() }
    keyboardApi.addEventListener?.('layoutchange', onLayoutChange)

    return () => {
      keyboardApi.removeEventListener?.('layoutchange', onLayoutChange)
    }
  }, [logRenderer])

  const contribution = useMemo(() => buildContributionModel(dailyStats), [dailyStats])
  const statsSummary = useMemo(
    () => buildStatsSummary(snapshot.totalKeystrokes, dailyStats, contribution.dayMap),
    [snapshot.totalKeystrokes, dailyStats, contribution.dayMap]
  )

  const selectedCounts = viewMode === 'today' ? snapshot.todayCounts : snapshot.allTimeCounts
  const heatmapMax = useMemo(() => {
    const values = Object.values(selectedCounts)
    return values.length > 0 ? Math.max(...values) : 0
  }, [selectedCounts])

  const setActionStatus = (message: string, isError = false): void => {
    setSettingsStatus({ message, isError })
  }

  const runMaintenanceAction = async (label: string, action: () => Promise<ActionResult>): Promise<void> => {
    setSettingsBusy(true)
    setActionStatus(`${label}...`)

    try {
      const result = await action()
      setActionStatus(result.message, !result.success)
      await logRenderer(result.success ? 'info' : 'warn', `${label} action finished.`, result)
      await refreshStorageInfo()
      if (result.success) await refreshAllData()
    } catch (error) {
      setActionStatus(`${label} failed unexpectedly. See debug.log.`, true)
      await logRenderer('error', `${label} action crashed.`, { error: String(error) })
    } finally {
      setSettingsBusy(false)
    }
  }

  const handleOpenPathAction = async (action: () => Promise<ActionResult>): Promise<void> => {
    try {
      const result = await action()
      setActionStatus(result.message, !result.success)
    } catch (error) {
      setActionStatus('Could not complete this action.', true)
      await logRenderer('error', 'Open path action crashed.', { error: String(error) })
    }
  }

  const handleCopyBtcAddress = async (): Promise<void> => {
    try {
      await copyTextToClipboard(BTC_ADDRESS)
      setBtcCopyLabel('Copied')
      if (btcLabelResetTimerRef.current) clearTimeout(btcLabelResetTimerRef.current)
      btcLabelResetTimerRef.current = setTimeout(() => setBtcCopyLabel('Copy'), 1400)
    } catch (error) {
      setBtcCopyLabel('Copy failed')
      if (btcLabelResetTimerRef.current) clearTimeout(btcLabelResetTimerRef.current)
      btcLabelResetTimerRef.current = setTimeout(() => setBtcCopyLabel('Copy'), 1800)
      await logRenderer('warn', 'Failed to copy BTC address.', { error: String(error) })
    }
  }

  const handleCopyDogeAddress = async (): Promise<void> => {
    try {
      await copyTextToClipboard(DOGE_ADDRESS)
      setDogeCopyLabel('Copied')
      if (dogeLabelResetTimerRef.current) clearTimeout(dogeLabelResetTimerRef.current)
      dogeLabelResetTimerRef.current = setTimeout(() => setDogeCopyLabel('Copy'), 1400)
    } catch (error) {
      setDogeCopyLabel('Copy failed')
      if (dogeLabelResetTimerRef.current) clearTimeout(dogeLabelResetTimerRef.current)
      dogeLabelResetTimerRef.current = setTimeout(() => setDogeCopyLabel('Copy'), 1800)
      await logRenderer('warn', 'Failed to copy DOGE address.', { error: String(error) })
    }
  }

  const handleOpenCoffeeLink = async (): Promise<void> => {
    const attemptId = `coffee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    await logRenderer('info', 'Buy Me a Coffee button clicked.', {
      attemptId,
      url: COFFEE_URL,
      activeTab,
    })

    try {
      await logRenderer('debug', 'Requesting main process to open coffee URL.', { attemptId })
      const result = await window.api.openExternalUrl(COFFEE_URL)
      await logRenderer(result.success ? 'info' : 'warn', 'Main process returned from openExternalUrl.', {
        attemptId,
        result,
      })

      if (!result.success) {
        await logRenderer('warn', 'Could not open Buy Me a Coffee URL via IPC.', result)
        const fallbackWindow = window.open(COFFEE_URL, '_blank', 'noopener,noreferrer')
        await logRenderer('info', 'Fallback window.open attempted after IPC failure.', {
          attemptId,
          opened: Boolean(fallbackWindow),
        })
      }
    } catch (error) {
      await logRenderer('error', 'Opening Buy Me a Coffee URL failed unexpectedly.', { error: String(error) })
      const fallbackWindow = window.open(COFFEE_URL, '_blank', 'noopener,noreferrer')
      await logRenderer('info', 'Fallback window.open attempted after exception.', {
        attemptId,
        opened: Boolean(fallbackWindow),
      })
    }
  }

  const renderKeyboard = (): JSX.Element => (
    <div className="keyboard-shell">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div key={`row-${rowIndex}`} className="keyboard-row">
          {row.map((key) => {
            const count = selectedCounts[key.keyCode] || 0
            const label = getDisplayLabel(layoutLabels[key.keyCode], key.fallbackLabel, key.keyCode)
            const width = key.width ? (key.width * KEY_WIDTH + (key.width - 1) * KEY_GAP) : KEY_WIDTH

            return (
              <div
                key={key.keyCode}
                className="keyboard-key"
                style={{
                  width,
                  backgroundColor: getHeatmapColor(count, heatmapMax),
                }}
                title={`${label}: ${count.toLocaleString()} keystrokes`}
              >
                <span className="key-label">{label}</span>
                <span className="key-count">{count.toLocaleString()}</span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )

  return (
    <div className="app-root">
      <header className="titlebar">
        <div className="titlebar-drag titlebar-brand">Open Keyboard Heatmap</div>
        <div className="titlebar-drag titlebar-center">
          <span>Total: {snapshot.totalKeystrokes.toLocaleString()}</span>
          <span>Today: {snapshot.todayKeystrokes.toLocaleString()}</span>
        </div>
        <div className="window-controls">
          <button className="window-btn" onClick={() => { void window.api.windowMinimize() }} aria-label="Minimize">—</button>
          <button className="window-btn" onClick={() => { void window.api.windowMaximizeToggle() }} aria-label="Maximize">
            {windowState.isMaximized ? '❐' : '□'}
          </button>
          <button className="window-btn window-btn-close" onClick={() => { void window.api.windowClose() }} aria-label="Close">✕</button>
        </div>
      </header>

      <main className="main-content">
        {captureStatus.mode === 'error' && (
          <p className="capture-status">{captureStatus.message}</p>
        )}

        <div className="tab-row" role="tablist" aria-label="Views">
          <button
            className={`tab-btn ${activeTab === 'keyboard' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('keyboard')}
            role="tab"
            aria-selected={activeTab === 'keyboard'}
          >
            Keyboard
          </button>
          <button
            className={`tab-btn ${activeTab === 'stats' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('stats')}
            role="tab"
            aria-selected={activeTab === 'stats'}
          >
            Stats
          </button>
          <button
            className={`tab-btn ${activeTab === 'settings' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('settings')}
            role="tab"
            aria-selected={activeTab === 'settings'}
          >
            Settings
          </button>
          <button
            className={`tab-btn ${activeTab === 'support' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('support')}
            role="tab"
            aria-selected={activeTab === 'support'}
          >
            Support
          </button>
        </div>

        {activeTab === 'keyboard' && (
          <section className="keyboard-view">
            <div className="keyboard-panel">
              <div className="panel-header">
                <h1>Keyboard Heatmap</h1>
                <select value={viewMode} onChange={(event) => setViewMode(event.target.value as ViewMode)}>
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                </select>
              </div>
              {renderKeyboard()}
            </div>
          </section>
        )}

        {activeTab === 'stats' && (
          <section className="stats-view">
            <h2 className="stats-title">
              {contribution.totalInRange.toLocaleString()} keystrokes in the last year ({contribution.activeInRange} active days)
            </h2>

            <div className="contrib-wrapper">
              <div className="contrib-months" style={{ ['--week-count' as string]: String(contribution.weeks.length) }}>
                {contribution.monthLabels.map((label) => (
                  <span
                    key={`${label.weekIndex}-${label.label}`}
                    className="contrib-month"
                    style={{ gridColumnStart: label.weekIndex + 1 }}
                  >
                    {label.label}
                  </span>
                ))}
              </div>

              <div className="contrib-main">
                <div className="contrib-weekdays">
                  <span>Mon</span>
                  <span>Wed</span>
                  <span>Fri</span>
                </div>

                <div className="contrib-grid" aria-label="Daily keystroke heatmap">
                  {contribution.weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="contrib-week">
                      {week.map((cell) => (
                        <span
                          key={cell.day}
                          className={`contrib-cell level-${getContributionLevel(cell.count, contribution.maxCount)} ${cell.inRange ? '' : 'out-of-range'}`}
                          title={cell.inRange ? `${cell.day}: ${cell.count.toLocaleString()} keystrokes` : ''}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="contrib-legend">
                <span>Less</span>
                <div className="legend-squares">
                  <span className="contrib-cell level-0" />
                  <span className="contrib-cell level-1" />
                  <span className="contrib-cell level-2" />
                  <span className="contrib-cell level-3" />
                  <span className="contrib-cell level-4" />
                </div>
                <span>More</span>
              </div>
            </div>

            <div className="stats-cards">
              <article className="stats-card"><h3>Total Keystrokes</h3><p>{snapshot.totalKeystrokes.toLocaleString()}</p></article>
              <article className="stats-card"><h3>Last 7 Days</h3><p>{statsSummary.last7.toLocaleString()}</p></article>
              <article className="stats-card"><h3>Last 30 Days</h3><p>{statsSummary.last30.toLocaleString()}</p></article>
              <article className="stats-card">
                <h3>Best Day</h3>
                <p>
                  {statsSummary.bestDay
                    ? `${dayFormatter.format(parseIsoDay(statsSummary.bestDay.day))} (${statsSummary.bestDay.total.toLocaleString()})`
                    : '-'}
                </p>
              </article>
              <article className="stats-card"><h3>Active Days</h3><p>{statsSummary.activeDays.toLocaleString()}</p></article>
              <article className="stats-card"><h3>Average / Active Day</h3><p>{statsSummary.average.toLocaleString()}</p></article>
              <article className="stats-card"><h3>Current Streak</h3><p>{statsSummary.currentStreak} days</p></article>
              <article className="stats-card"><h3>Longest Streak</h3><p>{statsSummary.longestStreak} days</p></article>
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="settings-view">
            <h2 className="settings-title">Settings</h2>

            <div className="settings-grid">
              <article className="settings-card">
                <h3>Storage</h3>
                <p className="settings-path-label">Database</p>
                <code className="settings-path">{storageInfo?.dbPath || '-'}</code>
                <p className="settings-path-label">Debug Log</p>
                <code className="settings-path">{storageInfo?.logFilePath || '-'}</code>

                <div className="settings-actions">
                  <button disabled={settingsBusy} className="settings-btn" onClick={() => { void handleOpenPathAction(window.api.openUserDataFolder) }}>
                    Open Data Folder
                  </button>
                  <button disabled={settingsBusy} className="settings-btn" onClick={() => { void handleOpenPathAction(window.api.openDebugLogFile) }}>
                    Open Debug Log
                  </button>
                </div>
              </article>

              <article className="settings-card">
                <h3>Database</h3>
                <p className="settings-help">
                  Backup creates a copy of the encrypted database and matching key file. Import replaces your current data.
                </p>
                <div className="settings-actions">
                  <button
                    disabled={settingsBusy}
                    className="settings-btn settings-btn-primary"
                    onClick={() => { void runMaintenanceAction('Creating backup', window.api.backupDatabase) }}
                  >
                    Backup Database
                  </button>
                  <button
                    disabled={settingsBusy}
                    className="settings-btn settings-btn-danger"
                    onClick={() => { void runMaintenanceAction('Importing database', window.api.importDatabase) }}
                  >
                    Import Database
                  </button>
                </div>
              </article>
            </div>

            {settingsStatus && (
              <p className={`settings-status ${settingsStatus.isError ? 'settings-status-error' : ''}`}>
                {settingsStatus.message}
              </p>
            )}
          </section>
        )}

        {activeTab === 'support' && (
          <section className="support-view">
            <aside className="donation-panel">
              <p className="donation-kicker">Support Development</p>
              <h2>Thank you for supporting this project.</h2>
              <p>
                If you would like new features faster, feel free to open a pull request or support development here.
              </p>
              <p className="donation-thanks">Thank you, your support really helps keep the project moving.</p>

              <button
                type="button"
                className="coffee-btn"
                onClick={() => { void handleOpenCoffeeLink() }}
              >
                ☕ Buy me a coffee
              </button>

              <div className="btc-card">
                <div className="btc-header-row">
                  <span className="btc-chip">BTC</span>
                  <code className="btc-address">{BTC_ADDRESS}</code>
                  <button className="btc-copy-btn" onClick={() => { void handleCopyBtcAddress() }}>{btcCopyLabel}</button>
                </div>
                <img src={btcQrImage} alt={`Bitcoin donation QR code for address ${BTC_ADDRESS}`} className="btc-qr" />
                <code className="qr-address-text">{BTC_ADDRESS}</code>
              </div>

              <div className="btc-card">
                <div className="btc-header-row">
                  <span className="btc-chip">DOGE</span>
                  <code className="btc-address">{DOGE_ADDRESS}</code>
                  <button className="btc-copy-btn" onClick={() => { void handleCopyDogeAddress() }}>{dogeCopyLabel}</button>
                </div>
                <img src={dogeQrImage} alt={`Dogecoin donation QR code for address ${DOGE_ADDRESS}`} className="btc-qr" />
                <code className="qr-address-text">{DOGE_ADDRESS}</code>
              </div>
            </aside>
          </section>
        )}
      </main>
    </div>
  )
}
