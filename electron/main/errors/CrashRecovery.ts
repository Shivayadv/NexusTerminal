import { app, dialog } from 'electron'

import type { MainEventBus } from '../core/events/MainEventBus'
import type { Logger } from '../core/logger/Logger'
import type { WindowManager } from '../services/WindowManager'

interface CrashRecord {
  timestamps: number[]
  recoveryAttempts: number
}

const MAX_CRASHES_IN_WINDOW = 3
const CRASH_WINDOW_MS = 60_000
const MAX_RECOVERY_ATTEMPTS = 3

/**
 * Listens for renderer and child-process crashes and attempts automatic
 * window recreation with exponential back-off.
 *
 * Recovery is aborted when:
 *  - The same window crashes ≥ MAX_CRASHES_IN_WINDOW times in CRASH_WINDOW_MS, OR
 *  - Total recovery attempts for that window exceed MAX_RECOVERY_ATTEMPTS
 */
export class CrashRecovery {
  private readonly records = new Map<number, CrashRecord>()

  constructor(
    private readonly windowManager: WindowManager,
    private readonly eventBus: MainEventBus,
    private readonly logger: Logger,
  ) {}

  register(): void {
    app.on('render-process-gone', (_event, webContents, details) => {
      const windowId = webContents.id
      this.logger.error('Renderer process gone', {
        windowId,
        reason: details.reason,
        exitCode: details.exitCode,
      })

      this.eventBus.emit('crash:renderer', {
        windowId,
        reason: details.reason,
        exitCode: details.exitCode,
      })

      // Clean exits (closed normally) don't need recovery
      if (details.reason === 'clean-exit') return

      void this.attemptRecovery(windowId, details.reason)
    })

    app.on('child-process-gone', (_event, details) => {
      this.logger.error('Child process gone', {
        type: details.type,
        reason: details.reason,
        exitCode: details.exitCode,
      })
    })

    this.logger.info('Crash recovery handlers registered')
  }

  // ---------------------------------------------------------------------------

  private async attemptRecovery(windowId: number, reason: string): Promise<void> {
    const record = this.getOrCreateRecord(windowId)
    const now = Date.now()

    // Prune timestamps outside the crash window
    record.timestamps = record.timestamps.filter((t) => now - t < CRASH_WINDOW_MS)
    record.timestamps.push(now)

    if (record.timestamps.length >= MAX_CRASHES_IN_WINDOW) {
      this.logger.error(`Window ${windowId} crashed ${record.timestamps.length} times in ${CRASH_WINDOW_MS / 1000}s — giving up`)
      this.eventBus.emit('crash:unrecoverable', { windowId })
      this.showCrashDialog(reason)
      return
    }

    if (record.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      this.logger.error(`Window ${windowId} exceeded max recovery attempts — giving up`)
      this.eventBus.emit('crash:unrecoverable', { windowId })
      this.showCrashDialog(reason)
      return
    }

    record.recoveryAttempts++
    const attempt = record.recoveryAttempts
    const delay = Math.min(1000 * 2 ** (attempt - 1), 8000)

    this.logger.warn(`Attempting recovery of window ${windowId} in ${delay}ms (attempt ${attempt})`)

    await new Promise<void>((resolve) => setTimeout(resolve, delay))

    try {
      this.windowManager.createMainWindow({ label: 'main' })
      this.eventBus.emit('crash:recovered', { windowId, attempt })
      this.logger.info(`Window ${windowId} recovered (attempt ${attempt})`)
    } catch (err) {
      this.logger.error(`Recovery of window ${windowId} failed`, err)
      this.eventBus.emit('crash:unrecoverable', { windowId })
    }
  }

  private getOrCreateRecord(windowId: number): CrashRecord {
    let record = this.records.get(windowId)
    if (!record) {
      record = { timestamps: [], recoveryAttempts: 0 }
      this.records.set(windowId, record)
    }
    return record
  }

  private showCrashDialog(reason: string): void {
    void dialog.showMessageBox({
      type: 'error',
      title: 'NexusTerminal — Crash',
      message: 'The application has encountered an unrecoverable error.',
      detail: `Reason: ${reason}\n\nPlease restart the application.`,
      buttons: ['Quit'],
    }).then(() => app.quit())
  }
}
