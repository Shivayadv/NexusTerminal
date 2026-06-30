import { app } from 'electron'

import { bootstrap } from './bootstrap'
import { mainContainer } from './core/di/container'
import { MAIN_TOKENS } from './core/di/tokens'
import { Logger } from './core/logger/Logger'
import type { WindowManager } from './services/WindowManager'

// Pre-boot logger — captures errors before the DI container is ready
const preBootLogger = new Logger('PreBoot')

process.on('uncaughtException', (error: Error) => {
  preBootLogger.error('Pre-boot uncaught exception', {
    message: error.message,
    stack: error.stack,
  })
})

process.on('unhandledRejection', (reason: unknown) => {
  preBootLogger.error('Pre-boot unhandled rejection', { reason: String(reason) })
})

// Single-instance lock — prevent two app instances running side by side
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  preBootLogger.warn('Another instance is already running — quitting')
  app.quit()
} else {
  // Focus the existing window if the user tries to open a second instance
  app.on('second-instance', () => {
    if (mainContainer.has(MAIN_TOKENS.WindowManager)) {
      const wm = mainContainer.resolve<WindowManager>(MAIN_TOKENS.WindowManager)
      const win = wm.getMainWindow()
      if (win) {
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    }
  })

  app
    .whenReady()
    .then(() => {
      bootstrap()
    })
    .catch((err: unknown) => {
      preBootLogger.error('Bootstrap failed', err)
      app.exit(1)
    })
}
