import { useEffect, useState, useSyncExternalStore } from 'react'

import { settingsStore, SettingsPanel } from '@features/settings'
import { ActivityBar, Sidebar, StatusBar, TitleBar } from '@features/shell'
import { LayoutStore, PaneView, TabBar } from '@features/terminal'

// eslint-disable-next-line import/no-unresolved
import styles from './App.module.css'

import type { ActivityPanel } from '@features/shell'
import type { PaneNode } from '@features/terminal/layout/types'

function firstShell(node: PaneNode): string {
  if (node.type === 'terminal') return node.shellType
  return firstShell(node.children[0])
}

// Module-level singletons — survive React StrictMode's double-mount cycle.
const layoutStore = new LayoutStore()

export function App() {
  const [ready, setReady] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivityPanel>('terminals')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const snapshot = useSyncExternalStore(layoutStore.subscribe, layoutStore.getSnapshot)

  useEffect(() => {
    // Apply persisted settings (CSS vars, xterm theme) before anything renders.
    settingsStore.initialize()

    if (!layoutStore.isInitialized()) {
      void layoutStore.initialize().then(() => setReady(true))
    } else {
      setReady(true)
    }
  }, [])

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return
      if (e.key === ',') {
        e.preventDefault()
        setSettingsOpen((o) => !o)
      } else if (e.key === 't') {
        e.preventDefault()
        void layoutStore.createTab(settingsStore.getSnapshot().defaultShell)
      } else if (e.key === 'w') {
        e.preventDefault()
        const active = snapshot.tabs.find((t) => t.id === snapshot.activeTabId)
        if (active) void layoutStore.closePane(active.activePaneId)
      } else if (e.key === 'b') {
        e.preventDefault()
        setSidebarOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [snapshot])

  const activeTab = snapshot.tabs.find((t) => t.id === snapshot.activeTabId)
  const activeShell = activeTab ? firstShell(activeTab.root) : 'powershell'

  const handleActivityChange = (panel: ActivityPanel) => {
    if (panel === activePanel) {
      setSidebarOpen((o) => !o)
    } else {
      setActivePanel(panel)
      setSidebarOpen(true)
    }
  }

  return (
    <div className={styles.root}>
      <TitleBar />

      <div className={styles.body}>
        <ActivityBar
          active={activePanel}
          onChange={handleActivityChange}
          onSettingsClick={() => setSettingsOpen(true)}
        />

        <Sidebar
          panel={activePanel}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
          terminal={{
            tabs: snapshot.tabs,
            activeTabId: snapshot.activeTabId,
            onTabClick: (id) => layoutStore.setActiveTab(id),
            onNewTab: () => void layoutStore.createTab(settingsStore.getSnapshot().defaultShell),
          }}
        />

        <div className={styles.main}>
          {ready && (
            <TabBar
              tabs={snapshot.tabs}
              activeTabId={snapshot.activeTabId}
              onTabClick={(id) => layoutStore.setActiveTab(id)}
              onTabClose={(id) => void layoutStore.closeTab(id)}
              onTabRename={(id, title) => layoutStore.renameTab(id, title)}
              onNewTab={() => void layoutStore.createTab(settingsStore.getSnapshot().defaultShell)}
              onDuplicateTab={() => activeTab && void layoutStore.duplicateTab(activeTab.id)}
              onSplitH={() =>
                activeTab && void layoutStore.splitPane(activeTab.activePaneId, 'horizontal')
              }
              onSplitV={() =>
                activeTab && void layoutStore.splitPane(activeTab.activePaneId, 'vertical')
              }
              onClosePane={() => activeTab && void layoutStore.closePane(activeTab.activePaneId)}
            />
          )}

          <div className={styles.terminals}>
            {!ready && <p className={styles.loading}>Starting…</p>}
            {ready &&
              snapshot.tabs.map((tab) => (
                <div
                  key={tab.id}
                  className={styles.tabPane}
                  style={{ display: tab.id === snapshot.activeTabId ? 'flex' : 'none' }}
                >
                  <PaneView node={tab.root} activePaneId={tab.activePaneId} store={layoutStore} />
                </div>
              ))}
          </div>
        </div>
      </div>

      <StatusBar tabCount={snapshot.tabs.length} activeShell={activeShell} />

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}
