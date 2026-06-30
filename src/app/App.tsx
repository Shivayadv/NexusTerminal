import { useEffect, useState } from 'react'

import styles from './App.module.css'

export function App() {
  const [version, setVersion] = useState<string>('')
  const [platform, setPlatform] = useState<string>('')

  useEffect(() => {
    void window.electron.app.getVersion().then(setVersion)
    void window.electron.app.getPlatform().then(setPlatform)
  }, [])

  return (
    <div className={styles.root}>
      <header className={styles.titleBar}>
        <span className={styles.logo}>NexusTerminal</span>
        <span className={styles.meta}>
          v{version} · {platform}
        </span>
      </header>
      <main className={styles.workspace}>
        <p className={styles.ready}>Ready. Environment is configured.</p>
      </main>
    </div>
  )
}
