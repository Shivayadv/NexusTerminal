import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'

import type { TerminalColors } from '@features/settings/themes'

export interface TerminalAppearance {
  fontFamily: string
  fontSize: number
  terminalColors: TerminalColors
  opacity: number
}

interface CacheEntry {
  term: Terminal
  fitAddon: FitAddon
  wrapper: HTMLDivElement
  opened: boolean
}

const cache = new Map<string, CacheEntry>()
const pendingScrollback = new Map<string, string>()

// Registered by SettingsStore so new terminals are created with the current appearance.
let appearanceGetter: (() => TerminalAppearance) | null = null

export function setAppearanceGetter(fn: () => TerminalAppearance): void {
  appearanceGetter = fn
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

function createTerminal(): Terminal {
  const ap = appearanceGetter?.()
  return new Terminal({
    fontFamily: ap?.fontFamily ?? '"Cascadia Code", "Cascadia Mono", Consolas, monospace',
    fontSize: ap?.fontSize ?? 14,
    lineHeight: 1.2,
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 5000,
    allowProposedApi: true,
    theme: ap
      ? { ...ap.terminalColors, background: hexToRgba(ap.terminalColors.background, ap.opacity) }
      : {
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
  })
}

/** Update font, size, and colors on every existing cached terminal. */
export function applyTerminalSettings(ap: TerminalAppearance): void {
  const bg = hexToRgba(ap.terminalColors.background, ap.opacity)
  for (const entry of cache.values()) {
    entry.term.options.fontFamily = ap.fontFamily
    entry.term.options.fontSize = ap.fontSize
    entry.term.options.theme = { ...ap.terminalColors, background: bg }
    if (entry.opened) {
      try { entry.fitAddon.fit() } catch { /* not yet in DOM */ }
    }
  }
}

function getOrCreate(terminalId: string): CacheEntry {
  const hit = cache.get(terminalId)
  if (hit) return hit

  const term = createTerminal()
  const fitAddon = new FitAddon()
  term.loadAddon(fitAddon)

  const wrapper = document.createElement('div')
  wrapper.style.width = '100%'
  wrapper.style.height = '100%'

  const entry: CacheEntry = { term, fitAddon, wrapper, opened: false }
  cache.set(terminalId, entry)
  return entry
}

/**
 * Attach a terminal to a container element.
 * If this is the first attach, calls term.open() (needs the element in the DOM first).
 * Returns the {term, fitAddon} so the caller can subscribe to events.
 */
export function mountTerminal(
  terminalId: string,
  container: HTMLElement,
): { term: Terminal; fitAddon: FitAddon } {
  const entry = getOrCreate(terminalId)

  // Append wrapper BEFORE open() so font metrics are computed against real DOM
  container.appendChild(entry.wrapper)

  if (!entry.opened) {
    entry.term.open(entry.wrapper)
    entry.opened = true

    // Replay any scrollback queued by LayoutStore before this terminal was mounted
    const queued = pendingScrollback.get(terminalId)
    if (queued) {
      pendingScrollback.delete(terminalId)
      entry.term.write(queued + '\r\n\x1b[90m[session restored]\x1b[0m\r\n')
    }

    entry.term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        const sel = entry.term.getSelection()
        if (sel) void navigator.clipboard.writeText(sel)
        return false
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        void navigator.clipboard.readText().then((text) => {
          if (text) entry.term.paste(text)
        })
        return false
      }
      return true
    })
  }

  if (container.offsetWidth > 0 && container.offsetHeight > 0) {
    entry.fitAddon.fit()
  }

  return { term: entry.term, fitAddon: entry.fitAddon }
}

/**
 * Detach the terminal's wrapper from its container without disposing it.
 * The xterm buffer and scrollback are preserved in the cache.
 */
export function unmountTerminal(terminalId: string, container: HTMLElement): void {
  const entry = cache.get(terminalId)
  if (entry && container.contains(entry.wrapper)) {
    container.removeChild(entry.wrapper)
  }
}

/**
 * Permanently destroy a terminal (called when the pane/tab is closed).
 */
export function evictTerminal(terminalId: string): void {
  const entry = cache.get(terminalId)
  if (!entry) return
  entry.term.dispose()
  cache.delete(terminalId)
}

/**
 * Queue scrollback text to be written into the terminal the next time it mounts.
 * Called by LayoutStore during session restore before React renders.
 */
export function queueScrollback(terminalId: string, text: string): void {
  pendingScrollback.set(terminalId, text)
}

/**
 * Serialize the visible buffer (up to 1000 lines) to plain text.
 * Called on beforeunload to persist scrollback for the next session.
 */
export function serializeBuffer(terminalId: string): string | null {
  const entry = cache.get(terminalId)
  if (!entry?.opened) return null
  const buf = entry.term.buffer.active
  const MAX = 1000
  const start = Math.max(0, buf.length - MAX)
  const lines: string[] = []
  for (let i = start; i < buf.length; i++) {
    const line = buf.getLine(i)
    lines.push(line ? line.translateToString(true) : '')
  }
  while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop()
  return lines.length > 0 ? lines.join('\n') : null
}
