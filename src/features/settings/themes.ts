export interface TerminalColors {
  background: string
  foreground: string
  cursor: string
  selectionBackground: string
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  brightBlack: string
  brightRed: string
  brightGreen: string
  brightYellow: string
  brightBlue: string
  brightMagenta: string
  brightCyan: string
  brightWhite: string
}

export interface ThemeDefinition {
  id: string
  name: string
  /** CSS custom property overrides applied to :root */
  cssVars: Record<string, string>
  /** xterm.js color palette */
  terminal: TerminalColors
}

// Extend this array to support custom themes in the future.
// The first entry is the fallback used when an unknown theme id is requested.
export const BUILTIN_THEMES: readonly ThemeDefinition[] = [
  {
    id: 'dark',
    name: 'Dark',
    cssVars: {
      '--color-bg': '#0d0d0d',
      '--color-surface': '#141414',
      '--color-surface-elevated': '#1c1c1c',
      '--color-border': '#252525',
      '--color-text': '#e2e2e2',
      '--color-text-muted': '#6e6e6e',
      '--color-activity': '#111111',
      '--color-sidebar': '#141414',
      '--color-statusbar-text': '#001a13',
    },
    terminal: {
      background: '#0d1117',
      foreground: '#e6edf3',
      cursor: '#58a6ff',
      selectionBackground: '#264f78',
      black: '#484f58',
      red: '#ff7b72',
      green: '#3fb950',
      yellow: '#d29922',
      blue: '#58a6ff',
      magenta: '#bc8cff',
      cyan: '#39c5cf',
      white: '#b1bac4',
      brightBlack: '#6e7681',
      brightRed: '#ffa198',
      brightGreen: '#56d364',
      brightYellow: '#e3b341',
      brightBlue: '#79c0ff',
      brightMagenta: '#d2a8ff',
      brightCyan: '#56d4dd',
      brightWhite: '#f0f6fc',
    },
  },
  {
    id: 'light',
    name: 'Light',
    cssVars: {
      '--color-bg': '#ffffff',
      '--color-surface': '#f6f8fa',
      '--color-surface-elevated': '#eaeef2',
      '--color-border': '#d0d7de',
      '--color-text': '#1f2328',
      '--color-text-muted': '#6e7781',
      '--color-activity': '#f0f2f5',
      '--color-sidebar': '#f6f8fa',
      '--color-statusbar-text': '#1a7f37',
    },
    terminal: {
      background: '#ffffff',
      foreground: '#24292f',
      cursor: '#0969da',
      selectionBackground: '#b6d2ff',
      black: '#24292f',
      red: '#cf222e',
      green: '#116329',
      yellow: '#953800',
      blue: '#0550ae',
      magenta: '#8250df',
      cyan: '#0969da',
      white: '#6e7781',
      brightBlack: '#57606a',
      brightRed: '#a40e26',
      brightGreen: '#1a7f37',
      brightYellow: '#633c01',
      brightBlue: '#0969da',
      brightMagenta: '#6639ba',
      brightCyan: '#218bff',
      brightWhite: '#8c959f',
    },
  },
]

export function getTheme(id: string): ThemeDefinition {
  return BUILTIN_THEMES.find((t) => t.id === id) ?? BUILTIN_THEMES[0]
}
