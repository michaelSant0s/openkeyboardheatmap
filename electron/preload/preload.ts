import { contextBridge, ipcRenderer } from 'electron'

interface KeyCountsSnapshot {
  allTimeCounts: Record<string, number>
  todayCounts: Record<string, number>
  totalKeystrokes: number
  todayKeystrokes: number
}

interface WindowStatePayload {
  isMaximized: boolean
}

contextBridge.exposeInMainWorld('api', {
  getKeyCounts: (day?: string) => ipcRenderer.invoke('get-key-counts', day),
  getTotalKeystrokes: () => ipcRenderer.invoke('get-total-keystrokes'),
  getDailyStats: (limit?: number) => ipcRenderer.invoke('get-daily-stats', limit),
  getCaptureStatus: () => ipcRenderer.invoke('get-capture-status'),
  getStorageInfo: () => ipcRenderer.invoke('get-storage-info'),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  importDatabase: () => ipcRenderer.invoke('import-database'),
  openUserDataFolder: () => ipcRenderer.invoke('open-user-data-folder'),
  openDebugLogFile: () => ipcRenderer.invoke('open-debug-log-file'),
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximizeToggle: () => ipcRenderer.invoke('window-maximize-toggle'),
  windowClose: () => ipcRenderer.invoke('window-close'),
  getWindowState: () => ipcRenderer.invoke('window-get-state'),
  logRenderer: (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    meta?: unknown
  ) => ipcRenderer.invoke('renderer-log', { level, message, meta }),
  onKeyCountsUpdated: (callback: (snapshot: KeyCountsSnapshot) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, snapshot: KeyCountsSnapshot) => callback(snapshot)
    ipcRenderer.on('key-counts-updated', listener)
    return () => { ipcRenderer.removeListener('key-counts-updated', listener) }
  },
  onCaptureStatusUpdated: (
    callback: (status: { mode: 'global' | 'error'; message: string }) => void
  ) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      status: { mode: 'global' | 'error'; message: string }
    ) => callback(status)
    ipcRenderer.on('capture-status-updated', listener)
    return () => { ipcRenderer.removeListener('capture-status-updated', listener) }
  },
  onWindowStateUpdated: (callback: (state: WindowStatePayload) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: WindowStatePayload) => callback(state)
    ipcRenderer.on('window-state-updated', listener)
    return () => { ipcRenderer.removeListener('window-state-updated', listener) }
  },
})
