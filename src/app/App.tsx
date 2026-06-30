import { useEffect, useState } from 'react'

import type { TerminalDto } from '@electron/shared/terminal'
import { TerminalView } from '@features/terminal'

import styles from './App.module.css'

export function App() {
  const [terminal, setTerminal] = useState<TerminalDto | null>(null)

  useEffect(() => {
    let id: string | null = null
    void window.electron.terminal.create({ shellType: 'powershell' }).then((dto) => {
      id = dto.id
      setTerminal(dto)
    })
    return () => {
      if (id) void window.electron.terminal.kill(id)
    }
  }, [])

  return (
    <div className={styles.root}>
      <header className={styles.titleBar}>
        <span className={styles.logo}>NexusTerminal</span>
      </header>
      <main className={styles.terminalArea}>
        {terminal ? (
          <TerminalView terminalId={terminal.id} />
        ) : (
          <p className={styles.ready}>Starting terminal…</p>
        )}
      </main>
    </div>
  )
}
