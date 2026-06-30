import { IPC } from '../../../shared/ipc-channels'
import type { TerminalCreateOptions } from '../../../shared/terminal'
import type { Logger } from '../../core/logger/Logger'
import type { TerminalManager } from '../../terminal/TerminalManager'
import type { SecureIpcRouter } from '../SecureIpcRouter'

export function registerTerminalHandlers(
  router: SecureIpcRouter,
  terminalManager: TerminalManager,
  logger: Logger,
): void {
  router.handle(
    IPC.TERMINAL.CREATE,
    (_event, opts) => terminalManager.create(opts as TerminalCreateOptions | undefined),
    'Spawn a new PTY terminal',
  )

  router.handle(
    IPC.TERMINAL.KILL,
    (_event, id) => { terminalManager.kill(id as string) },
    'Kill a PTY terminal by id',
  )

  router.handle(
    IPC.TERMINAL.LIST,
    () => terminalManager.list(),
    'List all active terminals',
  )

  router.on(
    IPC.TERMINAL.INPUT,
    (_event, id, data) => { terminalManager.input(id as string, data as string) },
    'Write keystrokes to a PTY',
  )

  router.on(
    IPC.TERMINAL.RESIZE,
    (_event, id, cols, rows) => {
      terminalManager.resize(id as string, cols as number, rows as number)
    },
    'Resize a PTY terminal',
  )

  logger.debug('Terminal IPC handlers registered (5 channels)')
}
