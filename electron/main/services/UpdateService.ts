import type { Logger } from '../core/logger/Logger'

export type UpdateChannel = 'stable' | 'beta'

export interface UpdateServiceOptions {
  channel?: UpdateChannel
  checkIntervalMs?: number
}

/**
 * Auto-update foundation stub.
 *
 * Phase 1 registers the IPC surface and polling interval so the renderer can
 * already call `window.electron.update.check()`. Actual electron-updater
 * integration belongs in Phase 2 once a code-signing certificate and release
 * server URL are available.
 */
export class UpdateService {
  private readonly channel: UpdateChannel
  private readonly checkIntervalMs: number
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly logger: Logger,
    options: UpdateServiceOptions = {},
  ) {
    this.channel = options.channel ?? 'stable'
    this.checkIntervalMs = options.checkIntervalMs ?? 4 * 60 * 60 * 1000 // 4 hours
  }

  start(): void {
    this.logger.info('UpdateService started', { channel: this.channel, intervalMs: this.checkIntervalMs })
    // Initial check deferred so startup isn't slowed down.
    this.intervalId = setInterval(() => { void this.checkForUpdates() }, this.checkIntervalMs)
    this.intervalId.unref?.()
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  async checkForUpdates(): Promise<void> {
    this.logger.debug('Checking for updates…', { channel: this.channel })
    // TODO Phase 2: integrate electron-updater
    // const { autoUpdater } = await import('electron-updater')
    // autoUpdater.channel = this.channel
    // autoUpdater.checkForUpdatesAndNotify()
  }
}
