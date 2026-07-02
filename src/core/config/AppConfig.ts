export interface AppConfig {
  readonly version: string
  readonly isDev: boolean
  readonly platform: string
}

export function createAppConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    version: '0.1.0',
    isDev: import.meta.env.DEV,
    platform: 'unknown',
    ...overrides,
  }
}
