export type ShellType = 'powershell' | 'cmd' | 'gitbash' | 'wsl'

export interface TerminalCreateOptions {
  shellType?: ShellType
  cols?: number
  rows?: number
  cwd?: string
}

export interface TerminalDto {
  id: string
  shellType: ShellType
  pid: number
  cols: number
  rows: number
  createdAt: number
}
