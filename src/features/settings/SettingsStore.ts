import { applyTerminalSettings, setAppearanceGetter } from '@features/terminal/terminalCache'

import { getTheme } from './themes'
import { DEFAULT_SETTINGS, type AppSettings } from './types'

const STORAGE_KEY = 'smux:settings'

function lightenHex(hex: string, amount: number): string {
  const clamp = (n: number) => Math.min(255, Math.max(0, n))
  const r = clamp(parseInt(hex.slice(1, 3), 16) + amount)
  const g = clamp(parseInt(hex.slice(3, 5), 16) + amount)
  const b = clamp(parseInt(hex.slice(5, 7), 16) + amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

class SettingsStore {
  private state: AppSettings
  private listeners = new Set<() => void>()

  constructor() {
    this.state = this.load()
    // Register so new terminals are created with the current appearance settings.
    setAppearanceGetter(() => this.terminalAppearance())
  }

  getSnapshot = (): AppSettings => this.state

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Apply persisted settings to the DOM on startup. Call once after the DOM is ready. */
  initialize(): void {
    this.apply()
  }

  update(patch: Partial<AppSettings>): void {
    this.state = { ...this.state, ...patch }
    this.apply()
    this.persist()
    this.emit()
  }

  reset(): void {
    this.state = { ...DEFAULT_SETTINGS }
    this.apply()
    this.persist()
    this.emit()
  }

  private terminalAppearance() {
    const theme = getTheme(this.state.theme)
    return {
      fontFamily: this.state.fontFamily,
      fontSize: this.state.fontSize,
      terminalColors: theme.terminal,
      opacity: this.state.terminalOpacity,
    }
  }

  private apply(): void {
    const theme = getTheme(this.state.theme)
    const root = document.documentElement

    for (const [prop, val] of Object.entries(theme.cssVars)) {
      root.style.setProperty(prop, val)
    }

    root.style.setProperty('--color-accent', this.state.accentColor)
    root.style.setProperty('--color-accent-hover', lightenHex(this.state.accentColor, 28))
    root.style.setProperty('--font-mono', this.state.fontFamily)

    applyTerminalSettings(this.terminalAppearance())
  }

  private load(): AppSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
    } catch { /* corrupt storage */ }
    return { ...DEFAULT_SETTINGS }
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
  }

  private emit(): void {
    this.listeners.forEach((l) => l())
  }
}

export const settingsStore = new SettingsStore()
