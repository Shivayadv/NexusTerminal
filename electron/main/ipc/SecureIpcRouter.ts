import { ipcMain } from 'electron'
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'

import type { IpcChannel } from '../../shared/ipc-channels'
import type { Logger } from '../core/logger/Logger'
import type { EnvironmentManager } from '../services/EnvironmentManager'

type InvokeHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown
type OnHandler = (event: IpcMainEvent, ...args: unknown[]) => void

interface RegisteredHandler {
  type: 'invoke' | 'on'
  description: string
}

/**
 * Wraps ipcMain with:
 *  - Sender origin validation (trusted URL allowlist)
 *  - Channel registration allowlist (unknown channels are rejected)
 *  - Structured logging of every call in development
 *  - Error isolation so handler throws do not crash the main process
 */
export class SecureIpcRouter {
  private readonly registered = new Map<string, RegisteredHandler>()

  constructor(
    private readonly env: EnvironmentManager,
    private readonly logger: Logger,
  ) {}

  /**
   * Register a two-way invoke handler (renderer calls, main replies).
   * Equivalent to ipcMain.handle() but with security wrapping.
   */
  handle(
    channel: IpcChannel,
    handler: InvokeHandler,
    description = '',
  ): void {
    this.assertUnregistered(channel)
    this.registered.set(channel, { type: 'invoke', description })

    ipcMain.handle(channel, async (event, ...args) => {
      if (!this.isTrustedSender(event)) {
        this.logger.warn(`IPC blocked — untrusted sender on "${channel}"`, {
          url: event.senderFrame?.url,
        })
        throw new Error(`[SecureIPC] Untrusted sender for channel: ${channel}`)
      }

      if (this.env.isDev) {
        this.logger.debug(`IPC invoke → "${channel}"`, args.length ? args : undefined)
      }

      try {
        return await Promise.resolve(handler(event, ...args))
      } catch (err) {
        this.logger.error(`IPC handler error on "${channel}"`, err)
        throw err
      }
    })
  }

  /**
   * Register a fire-and-forget listener (main listens, renderer fires).
   * Equivalent to ipcMain.on() but with security wrapping.
   */
  on(
    channel: IpcChannel,
    handler: OnHandler,
    description = '',
  ): void {
    this.assertUnregistered(channel)
    this.registered.set(channel, { type: 'on', description })

    ipcMain.on(channel, (event, ...args) => {
      if (!this.isTrustedSender(event)) {
        this.logger.warn(`IPC blocked — untrusted sender on "${channel}"`, {
          url: event.senderFrame?.url,
        })
        return
      }

      if (this.env.isDev) {
        this.logger.debug(`IPC on → "${channel}"`, args.length ? args : undefined)
      }

      try {
        handler(event, ...args)
      } catch (err) {
        this.logger.error(`IPC on-handler error on "${channel}"`, err)
      }
    })
  }

  /** Remove a previously registered invoke handler */
  removeHandler(channel: IpcChannel): void {
    ipcMain.removeHandler(channel)
    this.registered.delete(channel)
  }

  getRegisteredChannels(): string[] {
    return [...this.registered.keys()]
  }

  // ---------------------------------------------------------------------------

  private isTrustedSender(event: IpcMainInvokeEvent | IpcMainEvent): boolean {
    const url = event.senderFrame?.url ?? ''
    const origins = this.env.getTrustedOrigins()
    return origins.some((origin) => url.startsWith(origin))
  }

  private assertUnregistered(channel: string): void {
    if (this.registered.has(channel)) {
      throw new Error(`[SecureIPC] Channel already registered: "${channel}"`)
    }
  }
}
