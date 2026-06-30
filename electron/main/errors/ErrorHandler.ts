import { app, dialog } from 'electron'

import type { MainEventBus } from '../core/events/MainEventBus'
import type { Logger } from '../core/logger/Logger'

/**
 * Registers global process-level error handlers.
 * Must be called as early as possible — before app.whenReady().
 *
 * In development: errors are logged to console and swallowed so the DevTools
 * can show them.
 * In production: errors are logged to file and surfaced as native error dialogs
 * before the app exits.
 */
export class ErrorHandler {
  private static registered = false

  constructor(
    private readonly logger: Logger,
    private readonly eventBus: MainEventBus,
    private readonly isDev: boolean,
  ) {}

  register(): void {
    if (ErrorHandler.registered) return
    ErrorHandler.registered = true

    process.on('uncaughtException', (error: Error) => {
      this.handleUncaught(error)
    })

    process.on('unhandledRejection', (reason: unknown) => {
      this.handleUnhandledRejection(reason)
    })

    this.logger.info('Global error handlers registered')
  }

  // ---------------------------------------------------------------------------

  private handleUncaught(error: Error): void {
    this.logger.error('Uncaught exception', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    })

    this.eventBus.emit('error:uncaught', { error })

    if (!this.isDev) {
      this.showFatalDialog('Unexpected Error', error.message)
      app.exit(1)
    }
  }

  private handleUnhandledRejection(reason: unknown): void {
    const message = reason instanceof Error ? reason.message : String(reason)
    this.logger.error('Unhandled promise rejection', { reason: message })
    this.eventBus.emit('error:unhandled-rejection', { reason })
  }

  private showFatalDialog(title: string, detail: string): void {
    try {
      dialog.showErrorBox(`NexusTerminal — ${title}`, detail)
    } catch {
      // dialog may be unavailable before app is ready
    }
  }

  static reset(): void {
    ErrorHandler.registered = false
  }
}
