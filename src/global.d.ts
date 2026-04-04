export interface DailyStat {
  day: string
  total: number
}

export interface StorageInfo {
  dbPath: string
  keyPath: string
  userDataPath: string
  logFilePath: string
}

export interface ActionResult {
  success: boolean
  message: string
  path?: string
}

export interface KeyCountsSnapshot {
  allTimeCounts: Record<string, number>
  todayCounts: Record<string, number>
  totalKeystrokes: number
  todayKeystrokes: number
}

export interface CaptureStatus {
  mode: 'global' | 'error'
  message: string
}

export interface WindowStatePayload {
  isMaximized: boolean
}

declare global {
  interface Window {
    api: {
      getKeyCounts: (day?: string) => Promise<Record<string, number>>
      getTotalKeystrokes: () => Promise<number>
      getDailyStats: (limit?: number) => Promise<DailyStat[]>
      getCaptureStatus: () => Promise<CaptureStatus>
      getStorageInfo: () => Promise<StorageInfo>
      backupDatabase: () => Promise<ActionResult>
      importDatabase: () => Promise<ActionResult>
      openUserDataFolder: () => Promise<ActionResult>
      openDebugLogFile: () => Promise<ActionResult>
      openExternalUrl: (url: string) => Promise<ActionResult>
      windowMinimize: () => Promise<boolean>
      windowMaximizeToggle: () => Promise<boolean>
      windowClose: () => Promise<boolean>
      getWindowState: () => Promise<WindowStatePayload>
      logRenderer: (level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: unknown) => Promise<boolean>
      onKeyCountsUpdated: (callback: (snapshot: KeyCountsSnapshot) => void) => () => void
      onCaptureStatusUpdated: (callback: (status: CaptureStatus) => void) => () => void
      onWindowStateUpdated: (callback: (state: WindowStatePayload) => void) => () => void
    }
  }
}

export {}
