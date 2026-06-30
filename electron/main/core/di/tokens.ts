/** Main-process DI token registry. Symbol.for() keeps tokens stable across HMR reloads. */
export const MAIN_TOKENS = {
  Logger: Symbol.for('main.Logger'),
  EventBus: Symbol.for('main.EventBus'),
  EnvironmentManager: Symbol.for('main.EnvironmentManager'),
  ConfigService: Symbol.for('main.ConfigService'),
  WindowManager: Symbol.for('main.WindowManager'),
  IpcManager: Symbol.for('main.IpcManager'),
  SecureIpcRouter: Symbol.for('main.SecureIpcRouter'),
  ErrorHandler: Symbol.for('main.ErrorHandler'),
  CrashRecovery: Symbol.for('main.CrashRecovery'),
  AppLifecycleManager: Symbol.for('main.AppLifecycleManager'),
} as const
