import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
  type MessageBoxOptions,
  type OpenDialogOptions,
  type SaveDialogOptions,
} from 'electron'
import electronUpdater from 'electron-updater'
import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import {
  initDatabase,
  getKeyCounts,
  getTotalKeystrokes,
  getDailyStats,
  closeDatabase,
  getDatabasePaths,
} from './database'
import { startKeylogger, stopKeylogger, type KeyCountsSnapshot } from './keylogger'
import { logger, errorToMeta } from './logger'

const VITE_DEV_SERVER_URL = process.env['ELECTRON_RENDERER_URL']
const { autoUpdater } = electronUpdater

let mainWindow: BrowserWindow | null = null
let databaseReady = false

interface CaptureStatus {
  mode: 'global' | 'error'
  message: string
}

interface ActionResult {
  success: boolean
  message: string
  path?: string
}

interface RendererLogPayload {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  meta?: unknown
}

interface WindowStatePayload {
  isMaximized: boolean
}

let captureStatus: CaptureStatus = {
  mode: 'global',
  message: 'Global keyboard capture is active.',
}

function resolveHomeDirectoryForUser(username: string): string | null {
  if (!username) return null

  if (process.env.USER === username && process.env.HOME) {
    return process.env.HOME
  }

  try {
    const passwdContent = fs.readFileSync('/etc/passwd', 'utf-8')
    const match = passwdContent
      .split('\n')
      .find((line) => line.startsWith(`${username}:`))

    if (!match) return null
    const fields = match.split(':')
    return fields[5] || null
  } catch {
    return null
  }
}

function resolvePreferredUserDataPath(defaultUserDataPath: string): string {
  const isLinuxRoot = process.platform === 'linux'
    && typeof process.getuid === 'function'
    && process.getuid() === 0

  if (!isLinuxRoot) return defaultUserDataPath

  const sudoUser = process.env.SUDO_USER
  if (!sudoUser || sudoUser === 'root') return defaultUserDataPath

  const sudoHome = resolveHomeDirectoryForUser(sudoUser)
  if (!sudoHome) return defaultUserDataPath

  return path.join(sudoHome, '.config', path.basename(defaultUserDataPath))
}

function migrateUserDataIfNeeded(sourceUserDataPath: string, targetUserDataPath: string): void {
  if (path.resolve(sourceUserDataPath) === path.resolve(targetUserDataPath)) return

  const sourceDbPath = path.join(sourceUserDataPath, 'keystrokes.db')
  const sourceKeyPath = `${sourceDbPath}.key`
  const targetDbPath = path.join(targetUserDataPath, 'keystrokes.db')
  const targetKeyPath = `${targetDbPath}.key`

  const targetReady = fs.existsSync(targetDbPath) && fs.existsSync(targetKeyPath)
  if (targetReady) return

  const sourceReady = fs.existsSync(sourceDbPath) && fs.existsSync(sourceKeyPath)
  if (!sourceReady) return

  try {
    fs.mkdirSync(targetUserDataPath, { recursive: true })
    fs.copyFileSync(sourceDbPath, targetDbPath)
    fs.copyFileSync(sourceKeyPath, targetKeyPath)

    const sourceLogsDir = path.join(sourceUserDataPath, 'logs')
    const targetLogsDir = path.join(targetUserDataPath, 'logs')
    if (fs.existsSync(sourceLogsDir) && !fs.existsSync(targetLogsDir)) {
      fs.cpSync(sourceLogsDir, targetLogsDir, { recursive: true })
    }

    const sourceLegacyLogPath = path.join(sourceUserDataPath, 'debug.log')
    const targetLegacyLogPath = path.join(targetUserDataPath, 'debug.log')
    if (fs.existsSync(sourceLegacyLogPath) && !fs.existsSync(targetLegacyLogPath)) {
      fs.copyFileSync(sourceLegacyLogPath, targetLegacyLogPath)
    }

    logger.info('Migrated user data to preferred data path.', {
      sourceUserDataPath,
      targetUserDataPath,
      targetDbPath,
    })
  } catch (error) {
    logger.error('Failed to migrate user data to preferred data path.', {
      sourceUserDataPath,
      targetUserDataPath,
      error: errorToMeta(error),
    })
  }
}

function isLinuxRootProcess(): boolean {
  return process.platform === 'linux'
    && typeof process.getuid === 'function'
    && process.getuid() === 0
}

async function tryOpenExternalUrlAsSudoUser(urlToOpen: string): Promise<boolean> {
  if (!isLinuxRootProcess()) return false

  const sudoUser = process.env.SUDO_USER
  if (!sudoUser || sudoUser === 'root') return false

  const attempts: Array<{ command: string; args: string[] }> = [
    { command: 'runuser', args: ['-u', sudoUser, '--', 'xdg-open', urlToOpen] },
    { command: 'sudo', args: ['-u', sudoUser, 'xdg-open', urlToOpen] },
  ]

  for (const attempt of attempts) {
    const opened = await new Promise<boolean>((resolve) => {
      const child = spawn(attempt.command, attempt.args, { stdio: 'ignore' })
      child.once('error', (error) => {
        logger.warn('Delegated external URL opener failed to start.', {
          sudoUser,
          attempt,
          error: errorToMeta(error),
        })
        resolve(false)
      })
      child.once('exit', (code) => {
        if (code === 0) {
          logger.info('External URL opened via delegated sudo user command.', {
            sudoUser,
            method: attempt.command,
            urlToOpen,
          })
          resolve(true)
          return
        }

        logger.warn('Delegated external URL opener exited with non-zero status.', {
          sudoUser,
          method: attempt.command,
          code,
          urlToOpen,
        })
        resolve(false)
      })
    })

    if (opened) return true
  }

  return false
}

function getTodayIsoDay(): string {
  return new Date().toISOString().split('T')[0]
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, value) => sum + value, 0)
}

function buildSnapshotFromDatabase(): KeyCountsSnapshot {
  const todayCounts = getKeyCounts(getTodayIsoDay())

  return {
    allTimeCounts: getKeyCounts(),
    todayCounts,
    totalKeystrokes: getTotalKeystrokes(),
    todayKeystrokes: sumCounts(todayCounts),
  }
}

function emitCaptureStatus(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('capture-status-updated', captureStatus)
  }
}

function getWindowState(): WindowStatePayload {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { isMaximized: false }
  }

  return {
    isMaximized: mainWindow.isMaximized(),
  }
}

function emitWindowState(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('window-state-updated', getWindowState())
  }
}

function emitKeyCounts(snapshot: KeyCountsSnapshot): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('key-counts-updated', snapshot)
  }
}

function refreshRendererSnapshot(): void {
  try {
    emitKeyCounts(buildSnapshotFromDatabase())
  } catch (error) {
    logger.error('Failed to refresh renderer snapshot.', { error: errorToMeta(error) })
  }
}

function startCapture(): void {
  const keyloggerStart = startKeylogger((snapshot) => {
    emitKeyCounts(snapshot)
  })

  if (keyloggerStart.success) {
    captureStatus = {
      mode: 'global',
      message: 'Global keyboard capture is active.',
    }

    logger.info('Global key capture started.', { backend: keyloggerStart.backend || 'unknown' })
    return
  }

  const isRoot = typeof process.getuid === 'function' && process.getuid() === 0
  const isWaylandSession =
    process.platform === 'linux'
    && (
      process.env.XDG_SESSION_TYPE === 'wayland'
      || typeof process.env.WAYLAND_DISPLAY === 'string'
    )
  const waylandHint = isWaylandSession
    ? (
        isRoot
          ? 'Wayland session detected. App is running with root privileges for global capture.'
          : 'Wayland session detected. For always-on global capture, start the app with sudo '
            + '(for development: `sudo -E npm run dev`).'
      )
    : 'Global key capture backend unavailable.'
  const securityNote = isWaylandSession && !isRoot
    ? ' Running with sudo grants full system input access.'
    : ''
  const reason = keyloggerStart.errorMessage ? ` (${keyloggerStart.errorMessage})` : ''

  captureStatus = {
    mode: 'error',
    message: `${waylandHint}${securityNote}${reason}`,
  }

  logger.error('Failed to start global key capture.', {
    errorMessage: keyloggerStart.errorMessage || 'unknown error',
  })
}

function stopCapture(): void {
  try {
    stopKeylogger()
  } catch (error) {
    logger.error('Failed while stopping key capture.', { error: errorToMeta(error) })
  }
}

function resolveWindowIconPath(): string | undefined {
  const candidates = [
    path.join(process.cwd(), 'build/icons/icon.png'),
    path.join(__dirname, '../../build/icons/icon.png'),
    path.join(__dirname, '../../src/assets/app-icon-512.png'),
  ]

  return candidates.find((candidate) => fs.existsSync(candidate))
}

function createWindow(): void {
  const preloadCandidates = [
    path.join(__dirname, '../preload/preload.mjs'),
    path.join(__dirname, '../preload/preload.js'),
  ]
  const preloadPath = preloadCandidates.find((candidate) => fs.existsSync(candidate)) || preloadCandidates[0]
  const iconPath = resolveWindowIconPath()

  if (!fs.existsSync(preloadPath)) {
    logger.warn('Preload script path does not exist.', { preloadCandidates })
  }

  mainWindow = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 920,
    minHeight: 640,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#10131a',
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url).catch((error) => {
      logger.warn('Failed to open external URL.', {
        url,
        error: errorToMeta(error),
      })
    })
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    emitCaptureStatus()
    emitWindowState()
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logger.error('Renderer failed to load.', {
      errorCode,
      errorDescription,
      validatedURL,
    })
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Renderer process gone.', details)
  })

  mainWindow.webContents.on('unresponsive', () => {
    logger.warn('Renderer became unresponsive.')
  })

  mainWindow.on('maximize', emitWindowState)
  mainWindow.on('unmaximize', emitWindowState)

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL).catch((error) => {
      logger.error('Failed to load dev server URL.', {
        url: VITE_DEV_SERVER_URL,
        error: errorToMeta(error),
      })
    })
  } else {
    const htmlCandidates = [
      path.join(__dirname, '../../dist/index.html'),
      path.join(__dirname, '../dist/index.html'),
    ]
    const htmlPath = htmlCandidates.find((candidate) => fs.existsSync(candidate)) || htmlCandidates[0]
    mainWindow.loadFile(htmlPath).catch((error) => {
      logger.error('Failed to load renderer HTML file.', {
        htmlPath,
        htmlCandidates,
        error: errorToMeta(error),
      })
    })
  }
}

function setupAutoUpdater(): void {
  if (!app.isPackaged) {
    logger.info('Auto-updater is disabled in development mode.')
    return
  }

  autoUpdater.on('checking-for-update', () => {
    logger.info('Checking for app updates.')
  })

  autoUpdater.on('update-available', (info) => {
    logger.info('Update available.', {
      version: info.version,
      releaseDate: info.releaseDate,
    })
  })

  autoUpdater.on('update-not-available', (info) => {
    logger.info('No updates available.', {
      version: info.version,
    })
  })

  autoUpdater.on('error', (error) => {
    logger.error('Auto-updater error.', { error: errorToMeta(error) })
  })

  autoUpdater.on('download-progress', (progress) => {
    logger.info('Update download progress.', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', async (info) => {
    logger.info('Update downloaded.', {
      version: info.version,
      releaseDate: info.releaseDate,
    })

    try {
      const messageBoxOptions: MessageBoxOptions = {
        type: 'info',
        buttons: ['Restart now', 'Later'],
        defaultId: 0,
        cancelId: 1,
        title: 'Update ready to install',
        message: 'A new version has been downloaded.',
        detail: 'Restart the app now to apply the update.',
      }

      const response = (mainWindow && !mainWindow.isDestroyed())
        ? await dialog.showMessageBox(mainWindow, messageBoxOptions)
        : await dialog.showMessageBox(messageBoxOptions)

      if (response.response === 0) {
        autoUpdater.quitAndInstall()
      }
    } catch (error) {
      logger.error('Failed to show update dialog.', { error: errorToMeta(error) })
    }
  })

  autoUpdater.checkForUpdatesAndNotify().catch((error) => {
    logger.error('Failed to check for updates.', { error: errorToMeta(error) })
  })
}

function getTimestampForFileName(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19)
}

function restartServicesAfterMaintenance(dbPath: string, reason: string): void {
  initDatabase(dbPath)
  databaseReady = true
  startCapture()
  emitCaptureStatus()
  refreshRendererSnapshot()
  logger.info('Maintenance flow completed.', { reason, dbPath })
}

function isNativeModuleVersionMismatch(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return error.message.includes('NODE_MODULE_VERSION')
}

async function backupDatabase(): Promise<ActionResult> {
  const { dbPath, keyPath, userDataPath } = getDatabasePaths()

  const saveDialogOptions: SaveDialogOptions = {
    title: 'Backup keyboard database',
    defaultPath: path.join(userDataPath, `keystrokes-backup-${getTimestampForFileName()}.db`),
    filters: [{ name: 'Database', extensions: ['db'] }],
  }
  const saveResult = mainWindow
    ? await dialog.showSaveDialog(mainWindow, saveDialogOptions)
    : await dialog.showSaveDialog(saveDialogOptions)

  if (saveResult.canceled || !saveResult.filePath) {
    return { success: false, message: 'Backup canceled.' }
  }

  const targetDbPath = saveResult.filePath.endsWith('.db')
    ? saveResult.filePath
    : `${saveResult.filePath}.db`
  const targetKeyPath = `${targetDbPath}.key`

  logger.info('Starting database backup.', { targetDbPath })

  stopCapture()

  try {
    closeDatabase()

    fs.copyFileSync(dbPath, targetDbPath)
    fs.copyFileSync(keyPath, targetKeyPath)

    logger.info('Database backup completed.', {
      sourceDbPath: dbPath,
      targetDbPath,
      targetKeyPath,
    })

    return {
      success: true,
      message: 'Backup created successfully.',
      path: targetDbPath,
    }
  } catch (error) {
    logger.error('Database backup failed.', {
      dbPath,
      keyPath,
      targetDbPath,
      targetKeyPath,
      error: errorToMeta(error),
    })

    return {
      success: false,
      message: 'Backup failed. Check debug.log for details.',
    }
  } finally {
    try {
      restartServicesAfterMaintenance(dbPath, 'backup')
    } catch (error) {
      logger.error('Failed to restart services after backup.', { error: errorToMeta(error) })
    }
  }
}

async function importDatabase(): Promise<ActionResult> {
  const { dbPath, keyPath, userDataPath } = getDatabasePaths()

  const openDialogOptions: OpenDialogOptions = {
    title: 'Import keyboard database backup',
    properties: ['openFile'],
    filters: [{ name: 'Database', extensions: ['db'] }],
  }
  const openResult = mainWindow
    ? await dialog.showOpenDialog(mainWindow, openDialogOptions)
    : await dialog.showOpenDialog(openDialogOptions)

  if (openResult.canceled || openResult.filePaths.length === 0) {
    return { success: false, message: 'Import canceled.' }
  }

  const sourceDbPath = openResult.filePaths[0]
  const sourceKeyPath = `${sourceDbPath}.key`

  if (path.resolve(sourceDbPath) === path.resolve(dbPath)) {
    return {
      success: false,
      message: 'Selected database is already the active database.',
    }
  }

  if (!fs.existsSync(sourceKeyPath)) {
    logger.warn('Import aborted because matching key file is missing.', {
      sourceDbPath,
      expectedKeyPath: sourceKeyPath,
    })

    return {
      success: false,
      message: 'Import failed: matching .key file not found next to the selected .db file.',
    }
  }

  const backupsDir = path.join(userDataPath, 'backups')
  const safetyBackupDb = path.join(backupsDir, `pre-import-${getTimestampForFileName()}.db`)
  const safetyBackupKey = `${safetyBackupDb}.key`

  logger.info('Starting database import.', {
    sourceDbPath,
    sourceKeyPath,
    targetDbPath: dbPath,
  })

  stopCapture()

  try {
    closeDatabase()
    fs.mkdirSync(backupsDir, { recursive: true })

    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, safetyBackupDb)
    }

    if (fs.existsSync(keyPath)) {
      fs.copyFileSync(keyPath, safetyBackupKey)
    }

    for (const stalePath of [`${dbPath}-wal`, `${dbPath}-shm`]) {
      try {
        if (fs.existsSync(stalePath)) fs.unlinkSync(stalePath)
      } catch (error) {
        logger.warn('Could not remove stale SQLite sidecar file before import.', {
          stalePath,
          error: errorToMeta(error),
        })
      }
    }

    fs.copyFileSync(sourceDbPath, dbPath)
    fs.copyFileSync(sourceKeyPath, keyPath)

    logger.info('Database import completed.', {
      sourceDbPath,
      sourceKeyPath,
      safetyBackupDb,
      safetyBackupKey,
    })

    return {
      success: true,
      message: 'Import successful. Existing data replaced.',
      path: sourceDbPath,
    }
  } catch (error) {
    logger.error('Database import failed. Attempting rollback.', {
      sourceDbPath,
      sourceKeyPath,
      targetDbPath: dbPath,
      safetyBackupDb,
      safetyBackupKey,
      error: errorToMeta(error),
    })

    try {
      if (fs.existsSync(safetyBackupDb)) {
        fs.copyFileSync(safetyBackupDb, dbPath)
      }
      if (fs.existsSync(safetyBackupKey)) {
        fs.copyFileSync(safetyBackupKey, keyPath)
      }
      logger.info('Rollback after failed import completed.')
    } catch (rollbackError) {
      logger.error('Rollback after failed import also failed.', {
        error: errorToMeta(rollbackError),
      })
    }

    return {
      success: false,
      message: 'Import failed. Check debug.log for details.',
    }
  } finally {
    try {
      restartServicesAfterMaintenance(dbPath, 'import')
    } catch (error) {
      logger.error('Failed to restart services after import.', { error: errorToMeta(error) })
    }
  }
}

async function openPathInSystem(pathToOpen: string, label: string): Promise<ActionResult> {
  const error = await shell.openPath(pathToOpen)
  if (error) {
    logger.error('Failed to open system path.', {
      pathToOpen,
      label,
      error,
    })

    return {
      success: false,
      message: `Could not open ${label}.`,
    }
  }

  return {
    success: true,
    message: `${label} opened.`,
    path: pathToOpen,
  }
}

async function openExternalUrlInSystem(urlToOpen: string): Promise<ActionResult> {
  const normalized = (urlToOpen || '').trim()
  logger.info('openExternalUrlInSystem called.', {
    urlToOpen: normalized,
    hasMainWindow: Boolean(mainWindow && !mainWindow.isDestroyed()),
    isLinuxRoot: isLinuxRootProcess(),
    sudoUser: process.env.SUDO_USER || null,
  })

  if (!normalized) {
    logger.warn('openExternalUrlInSystem rejected empty URL.')
    return {
      success: false,
      message: 'URL is empty.',
    }
  }

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    logger.warn('openExternalUrlInSystem rejected invalid URL.', { urlToOpen: normalized })
    return {
      success: false,
      message: 'Invalid URL.',
    }
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    logger.warn('openExternalUrlInSystem rejected unsupported URL protocol.', {
      urlToOpen: normalized,
      protocol: parsed.protocol,
    })
    return {
      success: false,
      message: 'Only HTTP/HTTPS URLs are supported.',
    }
  }

  if (await tryOpenExternalUrlAsSudoUser(normalized)) {
    return {
      success: true,
      message: 'External URL opened.',
      path: normalized,
    }
  }

  try {
    await shell.openExternal(normalized)
    logger.info('External URL opened via IPC.', { urlToOpen: normalized })
    return {
      success: true,
      message: 'External URL opened.',
      path: normalized,
    }
  } catch (error) {
    logger.error('Failed to open external URL via IPC.', {
      urlToOpen: normalized,
      error: errorToMeta(error),
    })
    return {
      success: false,
      message: 'Could not open external URL.',
    }
  }
}

function registerProcessErrorLogging(): void {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception in main process.', { error: errorToMeta(error) })
  })

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection in main process.', {
      reason: errorToMeta(reason),
    })
  })
}

function registerIpcHandlers(): void {
  ipcMain.handle('get-key-counts', (_event, day?: string) => (databaseReady ? getKeyCounts(day) : {}))
  ipcMain.handle('get-total-keystrokes', () => (databaseReady ? getTotalKeystrokes() : 0))
  ipcMain.handle('get-daily-stats', (_event, limit?: number) => (databaseReady ? getDailyStats(limit) : []))
  ipcMain.handle('get-capture-status', () => captureStatus)

  ipcMain.handle('get-storage-info', () => {
    const storage = getDatabasePaths()
    return {
      dbPath: storage.dbPath,
      keyPath: storage.keyPath,
      userDataPath: storage.userDataPath,
      logFilePath: logger.getLogFilePath(),
    }
  })

  ipcMain.handle('backup-database', () => (
    databaseReady
      ? backupDatabase()
      : Promise.resolve({
          success: false,
          message: 'Database is unavailable. Rebuild native dependencies and restart the app.',
        })
  ))
  ipcMain.handle('import-database', () => (
    databaseReady
      ? importDatabase()
      : Promise.resolve({
          success: false,
          message: 'Database is unavailable. Rebuild native dependencies and restart the app.',
        })
  ))
  ipcMain.handle('open-user-data-folder', () => openPathInSystem(getDatabasePaths().userDataPath, 'data folder'))
  ipcMain.handle('open-debug-log-file', () => openPathInSystem(logger.getLogFilePath(), 'debug log file'))
  ipcMain.handle('open-external-url', (event, urlToOpen: string) => {
    logger.info('IPC open-external-url received.', {
      urlToOpen,
      processId: event.processId,
      frameId: event.frameId,
    })
    return openExternalUrlInSystem(urlToOpen)
  })
  ipcMain.handle('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize()
    }
    return true
  })
  ipcMain.handle('window-maximize-toggle', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
    emitWindowState()
    return true
  })
  ipcMain.handle('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close()
    }
    return true
  })
  ipcMain.handle('window-get-state', () => getWindowState())

  ipcMain.handle('renderer-log', (_event, payload: RendererLogPayload) => {
    const meta = payload.meta || null
    switch (payload.level) {
      case 'debug':
        logger.debug(`[renderer] ${payload.message}`, meta)
        break
      case 'info':
        logger.info(`[renderer] ${payload.message}`, meta)
        break
      case 'warn':
        logger.warn(`[renderer] ${payload.message}`, meta)
        break
      case 'error':
      default:
        logger.error(`[renderer] ${payload.message}`, meta)
        break
    }
    return true
  })
}

app.whenReady().then(() => {
  const defaultUserDataPath = app.getPath('userData')
  const preferredUserDataPath = resolvePreferredUserDataPath(defaultUserDataPath)
  if (path.resolve(preferredUserDataPath) !== path.resolve(defaultUserDataPath)) {
    migrateUserDataIfNeeded(defaultUserDataPath, preferredUserDataPath)
    app.setPath('userData', preferredUserDataPath)
  }

  registerProcessErrorLogging()
  logger.info('App started.', {
    userDataPath: logger.getUserDataPath(),
    logFilePath: logger.getLogFilePath(),
  })

  try {
    initDatabase()
    databaseReady = true
  } catch (error) {
    databaseReady = false
    logger.error('Initial database initialization failed at startup.', { error: errorToMeta(error) })
    const mismatchHint = isNativeModuleVersionMismatch(error)
      ? ' Native module mismatch detected. Run `npm run rebuild` and restart the app.'
      : ''
    captureStatus = {
      mode: 'error',
      message: `Database initialization failed. Check debug.log for details.${mismatchHint}`,
    }
  }

  createWindow()
  setupAutoUpdater()

  if (captureStatus.mode !== 'error') {
    startCapture()
  }

  emitCaptureStatus()
  registerIpcHandlers()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}).catch((error) => {
  logger.error('App failed during startup.', { error: errorToMeta(error) })
})

app.on('before-quit', () => {
  logger.info('App before-quit received.')
  stopCapture()
  try {
    if (databaseReady) {
      closeDatabase()
      databaseReady = false
    }
  } catch (error) {
    logger.error('Error while closing database on before-quit.', { error: errorToMeta(error) })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
