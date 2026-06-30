/**
 * Dependency injection token registry.
 * Use Symbol.for() so tokens are stable across module reloads in dev.
 */
export const TOKENS = {
  EventBus: Symbol.for('EventBus'),
  ConfigService: Symbol.for('ConfigService'),
  WorkspaceService: Symbol.for('WorkspaceService'),
  WorkspaceStore: Symbol.for('WorkspaceStore'),
  TerminalService: Symbol.for('TerminalService'),
  SessionService: Symbol.for('SessionService'),
  SettingsService: Symbol.for('SettingsService'),
} as const

export type TokenKey = keyof typeof TOKENS
