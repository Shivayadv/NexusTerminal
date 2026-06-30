import { app } from 'electron'

import type { MainEventBus } from '../core/events/MainEventBus'
import type { Logger } from '../core/logger/Logger'
import type { CrashRecovery } from '../errors/CrashRecovery'
import type { IpcManager } from '../ipc/IpcManager'
import type { WindowManager } from './WindowManager'

/**
 * Coordinates the full application lifecycle:
 *   start() → registers IPC, creates the main window, wires app events
 *   shutdown() → graceful teardown on quit
 *
 * AppLifecycleManager is the only place that calls app.on() — all other
 * services communicate through the EventBus.
 */
export class AppLifecycleManager {
  private isQuitting = false

  constructor(
    private readonly windowManager: WindowManager,
    private readonly ipcManager: IpcManager,
    private readonly crashRecovery: CrashRecovery,
    private readonly eventBus: MainEventBus,
    private readonly logger: Logger,
  ) {}

  /** Called once, inside app.whenReady() */
  start(): void {
    this.logger.info('AppLifecycleManager starting')

    // Register crash recovery before creating any windows
    this.crashRecovery.register()

    // Wire up all IPC handlers
    this.ipcManager.registerAll()

    // Create the initial window
    this.windowManager.createMainWindow({ label: 'main' })

    // Register OS-level lifecycle hooks
    this.registerAppEvents()

    this.eventBus.emit('app:ready', undefined)
    this.logger.info('Application ready')
  }

  // ---------------------------------------------------------------------------

  private registerAppEvents(): void {
    app.on('window-all-closed', this.onWindowAllClosed)
    app.on('activate', this.onActivate)
    app.on('before-quit', this.onBeforeQuit)
    app.on('will-quit', this.onWillQuit)
  }

  private readonly onWindowAllClosed = (): void => {
    // On macOS the app conventionally stays open when all windows are closed
    if (process.platform !== 'darwin') {
      app.quit()
    }
  }

  private readonly onActivate = (): void => {
    // Re-create the window when the dock icon is clicked (macOS)
    if (this.windowManager.getAllWindows().length === 0) {
      this.windowManager.createMainWindow({ label: 'main' })
    }
  }

  private readonly onBeforeQuit = (): void => {
    this.isQuitting = true
    this.eventBus.emit('app:before-quit', undefined)
    this.logger.info('App before-quit')
  }

  private readonly onWillQuit = (): void => {
    this.eventBus.emit('app:will-quit', undefined)
    this.logger.info('App will-quit')
  }

  isAppQuitting(): boolean {
    return this.isQuitting
  }
}
