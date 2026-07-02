import { useEffect, useLayoutEffect, useRef } from 'react'

import '@xterm/xterm/css/xterm.css'

import { mountTerminal, unmountTerminal } from './terminalCache'
import styles from './TerminalView.module.css'

interface Props {
  terminalId: string
  onTitleChange?: (title: string) => void
  onCwdChange?: (cwd: string) => void
}

export function TerminalView({ terminalId, onTitleChange, onCwdChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onTitleChangeRef = useRef(onTitleChange)
  const onCwdChangeRef = useRef(onCwdChange)
  useLayoutEffect(() => { onTitleChangeRef.current = onTitleChange })
  useLayoutEffect(() => { onCwdChangeRef.current = onCwdChange })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Attach the cached (or freshly created) xterm instance to our container.
    // The terminal's buffer and scrollback survive React tree restructuring (e.g. splits)
    // because we never call term.dispose() on unmount — only evictTerminal() does that.
    const { term, fitAddon } = mountTerminal(terminalId, el)

    // PTY I/O subscriptions — established fresh on every mount
    const dataDisposer = term.onData((data) => {
      window.electron.terminal.input(terminalId, data)
    })

    const unsubData = window.electron.terminal.onData((id, data) => {
      if (id === terminalId) term.write(data)
    })

    const unsubExit = window.electron.terminal.onExit((id, code) => {
      if (id === terminalId)
        term.write(`\r\n\x1b[90m[Process exited with code ${code}]\x1b[0m\r\n`)
    })

    const titleDisposer = term.onTitleChange((title) => {
      void window.electron.window.setTitle(title)
      onTitleChangeRef.current?.(title)
    })

    // Parse OSC 7 (shell CWD notification) to track working directory per pane.
    // Shells emit: ESC]7;file://hostname/path BEL after each prompt.
    const osc7Disposer = term.parser.registerOscHandler(7, (data) => {
      if (data.startsWith('file://')) {
        try {
          const url = new URL(data)
          let path = decodeURIComponent(url.pathname)
          // Windows: /C:/Users/foo → C:/Users/foo
          if (/^\/[A-Za-z]:\//.test(path)) path = path.slice(1)
          onCwdChangeRef.current?.(path)
        } catch { /* malformed URL */ }
      }
      return false // don't suppress — let xterm process it too
    })

    let resizeTimer: ReturnType<typeof setTimeout> | null = null
    const resizeDisposer = term.onResize(({ cols, rows }) => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        window.electron.terminal.resize(terminalId, cols, rows)
      }, 50)
    })

    const observer = new ResizeObserver(() => {
      if (el.offsetWidth > 0 && el.offsetHeight > 0) fitAddon.fit()
    })
    observer.observe(el)

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      dataDisposer.dispose()
      titleDisposer.dispose()
      osc7Disposer.dispose()
      resizeDisposer.dispose()
      unsubData()
      unsubExit()
      observer.disconnect()
      // Detach wrapper from DOM — keeps the xterm instance and buffer alive in cache
      unmountTerminal(terminalId, el)
    }
  }, [terminalId])

  return <div ref={containerRef} className={styles.terminal} />
}
