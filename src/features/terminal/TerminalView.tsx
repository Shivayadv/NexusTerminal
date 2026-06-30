import { useEffect, useRef } from 'react'

import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

import styles from './TerminalView.module.css'

interface Props {
  terminalId: string
  onTitleChange?: (title: string) => void
}

export function TerminalView({ terminalId, onTitleChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const term = new Terminal({
      fontFamily: '"Cascadia Code", "Cascadia Mono", Consolas, "Courier New", monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
      allowProposedApi: true,
      theme: {
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

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    term.open(el)
    fitAddon.fit()

    // Clipboard shortcuts — intercept before xterm sends to PTY
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        const sel = term.getSelection()
        if (sel) void navigator.clipboard.writeText(sel)
        return false
      }
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        void navigator.clipboard.readText().then((text) => { if (text) term.paste(text) })
        return false
      }
      return true
    })

    // User keystrokes → PTY
    const dataDisposer = term.onData((data) => {
      window.electron.terminal.input(terminalId, data)
    })

    // PTY output → terminal display
    const unsubData = window.electron.terminal.onData((id, data) => {
      if (id === terminalId) term.write(data)
    })

    // PTY process exit
    const unsubExit = window.electron.terminal.onExit((id, code) => {
      if (id === terminalId)
        term.write(`\r\n\x1b[90m[Process exited with code ${code}]\x1b[0m\r\n`)
    })

    // Title (OSC sequences parsed by xterm)
    const titleDisposer = term.onTitleChange((title) => {
      void window.electron.window.setTitle(title)
      onTitleChange?.(title)
    })

    // Debounced PTY resize — fires after terminal dimensions settle
    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const resizeDisposer = term.onResize(({ cols, rows }) => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        window.electron.terminal.resize(terminalId, cols, rows)
      }, 50)
    })

    // ResizeObserver keeps xterm dimensions in sync with DOM container
    const observer = new ResizeObserver(() => { fitAddon.fit() })
    observer.observe(el)

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      dataDisposer.dispose()
      titleDisposer.dispose()
      resizeDisposer.dispose()
      unsubData()
      unsubExit()
      observer.disconnect()
      term.dispose()
    }
  }, [terminalId, onTitleChange])

  return <div ref={containerRef} className={styles.terminal} />
}
