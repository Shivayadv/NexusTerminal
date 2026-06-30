export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface WindowState {
  width: number
  height: number
  /** null means "let the OS decide" */
  x: number | null
  y: number | null
  isMaximized: boolean
}

export interface AppConfigSchema {
  window: WindowState
  appearance: {
    theme: 'dark' | 'light' | 'system'
  }
  terminal: {
    fontSize: number
    fontFamily: string
    cursorStyle: 'block' | 'underline' | 'bar'
    scrollback: number
  }
  logging: {
    level: LogLevel
  }
}

export const DEFAULT_CONFIG: AppConfigSchema = {
  window: {
    width: 1280,
    height: 800,
    x: null,
    y: null,
    isMaximized: false,
  },
  appearance: {
    theme: 'dark',
  },
  terminal: {
    fontSize: 14,
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
    cursorStyle: 'block',
    scrollback: 10000,
  },
  logging: {
    level: 'info',
  },
}
