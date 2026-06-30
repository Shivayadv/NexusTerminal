import { app } from 'electron'

import { IPC } from '../../../shared/ipc-channels'
import type { SecureIpcRouter } from '../SecureIpcRouter'
import type { EnvironmentManager } from '../../services/EnvironmentManager'

export function registerAppHandlers(router: SecureIpcRouter, env: EnvironmentManager): void {
  router.handle(
    IPC.APP.GET_VERSION,
    () => app.getVersion(),
    'Returns the application version string',
  )

  router.handle(
    IPC.APP.GET_PLATFORM,
    () => process.platform,
    'Returns the OS platform identifier',
  )

  router.handle(
    IPC.APP.GET_ENVIRONMENT,
    () => env.environment,
    'Returns "development" or "production"',
  )
}
