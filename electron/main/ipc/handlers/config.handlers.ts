import type { AppConfigSchema } from '../../../shared/config-schema'
import { IPC } from '../../../shared/ipc-channels'
import type { Logger } from '../../core/logger/Logger'
import type { ConfigService } from '../../services/ConfigService'
import type { SecureIpcRouter } from '../SecureIpcRouter'

export function registerConfigHandlers(
  router: SecureIpcRouter,
  config: ConfigService,
  logger: Logger,
): void {
  router.handle(IPC.CONFIG.GET, (_event, key) => {
    if (typeof key !== 'string' || !(key in config.getAll())) {
      logger.warn(`config:get — unknown key "${String(key)}"`)
      return null
    }
    return config.get(key as keyof AppConfigSchema)
  }, 'Get a top-level config value by key')

  router.handle(IPC.CONFIG.SET, (_event, key, value) => {
    if (typeof key !== 'string' || !(key in config.getAll())) {
      logger.warn(`config:set — unknown key "${String(key)}"`)
      return
    }
    config.set(key as keyof AppConfigSchema, value as AppConfigSchema[keyof AppConfigSchema])
  }, 'Set a top-level config value')

  router.handle(IPC.CONFIG.RESET, () => {
    config.reset()
  }, 'Reset all config to defaults')
}
