import type { ShellType } from '@electron/shared/terminal'

export interface AppSettings {
  // Appearance
  theme: string
  accentColor: string

  // Font
  fontFamily: string
  fontSize: number

  // Terminal
  terminalOpacity: number
  defaultShell: ShellType

  // Startup
  restoreSession: boolean

  // Window
  confirmOnClose: boolean
  startMaximized: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#00d4aa',
  fontFamily: '"Cascadia Code", "Cascadia Mono", Consolas, monospace',
  fontSize: 14,
  terminalOpacity: 1.0,
  defaultShell: 'powershell',
  restoreSession: true,
  confirmOnClose: false,
  startMaximized: false,
}
