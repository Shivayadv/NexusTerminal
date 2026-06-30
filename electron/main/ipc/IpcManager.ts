import type { Logger } from '../core/logger/Logger'
import type { ConfigService } from '../services/ConfigService'
import type { EnvironmentManager } from '../services/EnvironmentManager'
import type { WindowManager } from '../services/WindowManager'
import { registerAppHandlers } from './handlers/app.handlers'
import { registerConfigHandlers } from './handlers/config.handlers'
import { registerLogHandlers } from './handlers/log.handlers'
import { registerWindowHandlers } from './handlers/window.handlers'
import type { SecureIpcRouter } from './SecureIpcRouter'

/**
 * Central coordinator that registers every IPC handler exactly once.
 * Each feature area has its own handler module; IpcManager composes them.
 */
export class IpcManager {
  constructor(
    private readonly router: SecureIpcRouter,
    private readonly windowManager: WindowManager,
    private readonly configService: ConfigService,
    private readonly env: EnvironmentManager,
    private readonly logger: Logger,
  ) {}

  registerAll(): void {
    registerAppHandlers(this.router, this.env)
    registerWindowHandlers(this.router, this.windowManager, this.logger.child('window'))
    registerConfigHandlers(this.router, this.configService, this.logger.child('config'))
    registerLogHandlers(this.router, this.logger.child('log'))

    this.logger.info(
      `IPC: ${this.router.getRegisteredChannels().length} channels registered`,
      this.router.getRegisteredChannels(),
    )
  }
}
