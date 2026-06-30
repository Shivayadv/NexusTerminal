import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import { LayoutStore, PaneView, TabBar } from '@features/terminal'

import styles from './App.module.css'

export function App() {
  const store = useMemo(() => new LayoutStore(), [])
  const [ready, setReady] = useState(false)
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)

  useEffect(() => {
    void store.initialize().then(() => setReady(true))
  }, [store])

  // Keyboard shortcuts (global — Ctrl+T new tab, Ctrl+W close active pane)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return
      if (e.key === 't') {
        e.preventDefault()
        void store.createTab()
      } else if (e.key === 'w') {
        e.preventDefault()
        const active = snapshot.tabs.find((t) => t.id === snapshot.activeTabId)
        if (active) void store.closePane(active.activePaneId)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [store, snapshot])

  const activeTab = snapshot.tabs.find((t) => t.id === snapshot.activeTabId)

  return (
    <div className={styles.root}>
      <header className={styles.titleBar}>
        <span className={styles.logo}>NexusTerminal</span>
      </header>

      {ready && (
        <TabBar
          tabs={snapshot.tabs}
          activeTabId={snapshot.activeTabId}
          onTabClick={(id) => store.setActiveTab(id)}
          onTabClose={(id) => void store.closeTab(id)}
          onTabRename={(id, title) => store.renameTab(id, title)}
          onNewTab={() => void store.createTab()}
          onSplitH={() => activeTab && void store.splitPane(activeTab.activePaneId, 'horizontal')}
          onSplitV={() => activeTab && void store.splitPane(activeTab.activePaneId, 'vertical')}
          onClosePane={() => activeTab && void store.closePane(activeTab.activePaneId)}
        />
      )}

      <main className={styles.terminalArea}>
        {!ready && <p className={styles.loading}>Starting…</p>}
        {ready && activeTab && (
          <PaneView
            node={activeTab.root}
            activePaneId={activeTab.activePaneId}
            store={store}
          />
        )}
      </main>
    </div>
  )
}
