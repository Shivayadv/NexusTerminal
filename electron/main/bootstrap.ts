import { app } from 'electron'

import { mainContainer } from './core/di/container'
import { MAIN_TOKENS } from './core/di/tokens'
import { MainEventBus } from './core/events/MainEventBus'
import { Logger } from './core/logger/Logger'
import { CrashRecovery } from './errors/CrashRecovery'
import { ErrorHandler } from './errors/ErrorHandler'
import { IpcManager } from './ipc/IpcManager'
import { SecureIpcRouter } from './ipc/SecureIpcRouter'
import { AppLifecycleManager } from './services/AppLifecycleManager'
import { ConfigService } from './services/ConfigService'
import { EnvironmentManager } from './services/EnvironmentManager'
import { WindowManager } from './services/WindowManager'

/**
 * Composition root — wires every main-process service into the DI container
 * and then starts the application lifecycle.
 *
 * Call order matters:
 *   1. EnvironmentManager  (no deps)
 *   2. Logger              (static file init needs paths from Env)
 *   3. EventBus            (no deps)
 *   4. ErrorHandler        (needs Logger + EventBus — registers process hooks)
 *   5. ConfigService       (needs userData path, Logger, EventBus)
 *   6. WindowManager       (needs Env, Config, EventBus, Logger)
 *   7. SecureIpcRouter     (needs Env, Logger)
 *   8. IpcManager          (needs Router, Window, Config, Env, Logger)
 *   9. CrashRecovery       (needs Window, EventBus, Logger)
 *  10. AppLifecycleManager (needs Window, Ipc, Crash, EventBus, Logger)
 */
export function bootstrap(): void {
  // 1. Environment
  mainContainer.register(MAIN_TOKENS.EnvironmentManager, () => new EnvironmentManager())
  const env = mainContainer.resolve<EnvironmentManager>(MAIN_TOKENS.EnvironmentManager)

  // 2. Logger — init file logging now that app is ready and paths are available
  const rootLogger = new Logger('App')
  Logger.initFileLogging(env.getLogPath())
  Logger.setMinLevel(env.isDev ? 'debug' : 'info')
  mainContainer.register(MAIN_TOKENS.Logger, () => rootLogger)

  // 3. EventBus
  mainContainer.register(MAIN_TOKENS.EventBus, () => new MainEventBus())
  const eventBus = mainContainer.resolve<MainEventBus>(MAIN_TOKENS.EventBus)

  // 4. ErrorHandler
  const errorHandler = new ErrorHandler(rootLogger.child('ErrorHandler'), eventBus, env.isDev)
  errorHandler.register()
  mainContainer.register(MAIN_TOKENS.ErrorHandler, () => errorHandler, { singleton: false })

  // 5. ConfigService
  mainContainer.register(MAIN_TOKENS.ConfigService, () =>
    new ConfigService(
      env.getUserDataPath(),
      eventBus,
      rootLogger.child('ConfigService'),
    ),
  )
  const configService = mainContainer.resolve<ConfigService>(MAIN_TOKENS.ConfigService)
  Logger.setMinLevel(configService.getLogLevel())

  // 6. WindowManager
  mainContainer.register(MAIN_TOKENS.WindowManager, () =>
    new WindowManager(env, configService, eventBus, rootLogger.child('WindowManager')),
  )
  const windowManager = mainContainer.resolve<WindowManager>(MAIN_TOKENS.WindowManager)

  // 7. SecureIpcRouter
  mainContainer.register(MAIN_TOKENS.SecureIpcRouter, () =>
    new SecureIpcRouter(env, rootLogger.child('IpcRouter')),
  )
  const router = mainContainer.resolve<SecureIpcRouter>(MAIN_TOKENS.SecureIpcRouter)

  // 8. IpcManager
  mainContainer.register(MAIN_TOKENS.IpcManager, () =>
    new IpcManager(router, windowManager, configService, env, rootLogger.child('IpcManager')),
  )
  const ipcManager = mainContainer.resolve<IpcManager>(MAIN_TOKENS.IpcManager)

  // 9. CrashRecovery
  mainContainer.register(MAIN_TOKENS.CrashRecovery, () =>
    new CrashRecovery(windowManager, eventBus, rootLogger.child('CrashRecovery')),
  )
  const crashRecovery = mainContainer.resolve<CrashRecovery>(MAIN_TOKENS.CrashRecovery)

  // 10. AppLifecycleManager — start the app
  mainContainer.register(MAIN_TOKENS.AppLifecycleManager, () =>
    new AppLifecycleManager(windowManager, ipcManager, crashRecovery, eventBus, rootLogger.child('Lifecycle')),
  )
  const lifecycle = mainContainer.resolve<AppLifecycleManager>(MAIN_TOKENS.AppLifecycleManager)
  lifecycle.start()

  // Push config changes to all open renderer windows
  eventBus.on('config:changed', ({ key, value }) => {
    windowManager.getAllWindows().forEach((win) => {
      win.webContents.send('config:push-changed', key, value)
    })
  })

  // Log startup info
  rootLogger.info(`NexusTerminal v${app.getVersion()} started`, {
    env: env.environment,
    platform: env.platform,
    arch: env.arch,
    userData: env.getUserDataPath(),
    logFile: Logger.getLogFilePath(),
  })
}
