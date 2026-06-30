import type { LogLevel } from '../../../shared/config-schema'
import { IPC } from '../../../shared/ipc-channels'
import type { Logger } from '../../core/logger/Logger'
import type { SecureIpcRouter } from '../SecureIpcRouter'

interface LogWritePayload {
  level: LogLevel
  context: string
  message: string
  data?: unknown
}

const VALID_LEVELS: ReadonlySet<LogLevel> = new Set(['debug', 'info', 'warn', 'error'])

export function registerLogHandlers(router: SecureIpcRouter, rootLogger: Logger): void {
  const rendererLogger = rootLogger.child('renderer')

  router.on(IPC.LOG.WRITE, (_event, payload) => {
    const p = payload as LogWritePayload
    if (!p || typeof p.message !== 'string' || !VALID_LEVELS.has(p.level)) return
    const ctx = typeof p.context === 'string' ? p.context : 'unknown'
    rendererLogger.child(ctx)[p.level](p.message, p.data)
  }, 'Forward renderer log entries to the main-process logger')
}
