import type { ShellType } from '@electron/shared/terminal'

export type PaneNode = TerminalPane | SplitPane

export interface TerminalPane {
  type: 'terminal'
  id: string
  terminalId: string
  title: string
  shellType: ShellType
  cwd?: string       // last known working directory (updated via OSC 7)
  scrollback?: string // serialized buffer text for session restore
}

export interface SplitPane {
  type: 'split'
  id: string
  direction: 'horizontal' | 'vertical'
  children: PaneNode[]  // always >= 2
  sizes: number[]       // flex proportions, same length as children
}

export interface Tab {
  id: string
  title: string
  root: PaneNode
  activePaneId: string
}

export interface LayoutSnapshot {
  tabs: Tab[]
  activeTabId: string | null
}
