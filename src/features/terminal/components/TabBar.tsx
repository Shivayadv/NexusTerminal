import { useRef, useState } from 'react'

import type { Tab } from '../layout/types'
import styles from './TabBar.module.css'

interface Props {
  tabs: Tab[]
  activeTabId: string | null
  onTabClick: (id: string) => void
  onTabClose: (id: string) => void
  onTabRename: (id: string, title: string) => void
  onNewTab: () => void
  onSplitH: () => void
  onSplitV: () => void
  onClosePane: () => void
}

export function TabBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabRename,
  onNewTab,
  onSplitH,
  onSplitV,
  onClosePane,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = (tab: Tab) => {
    setEditingId(tab.id)
    setEditValue(tab.title)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commitEdit = () => {
    if (editingId && editValue.trim()) onTabRename(editingId, editValue.trim())
    setEditingId(null)
  }

  return (
    <div className={styles.bar}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ''}`}
            onClick={() => onTabClick(tab.id)}
            onDoubleClick={() => startEdit(tab)}
            title={tab.title}
          >
            {editingId === tab.id ? (
              <input
                ref={inputRef}
                className={styles.editInput}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit()
                  if (e.key === 'Escape') setEditingId(null)
                  e.stopPropagation()
                }}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={styles.title}>{tab.title}</span>
            )}
            <button
              className={styles.closeTab}
              onClick={(e) => { e.stopPropagation(); onTabClose(tab.id) }}
              tabIndex={-1}
              title="Close tab"
            >
              ×
            </button>
          </div>
        ))}
        <button className={styles.newTab} onClick={onNewTab} title="New tab (Ctrl+T)">
          +
        </button>
      </div>

      <div className={styles.paneControls}>
        <button className={styles.action} onClick={onSplitH} title="Split right">
          ⊟─
        </button>
        <button className={styles.action} onClick={onSplitV} title="Split down">
          ⊟│
        </button>
        <button className={styles.action} onClick={onClosePane} title="Close pane">
          ✕
        </button>
      </div>
    </div>
  )
}
