import { useState, type ReactNode } from 'react'

import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleIcon,
  PanelCloseIcon,
  PlusIcon,
  SearchIcon,
  TerminalIcon,
} from './icons'
import styles from './Sidebar.module.css'

import type { ActivityPanel } from './ActivityBar'
import type { Tab } from '@features/terminal/layout/types'

interface TerminalData {
  tabs: Tab[]
  activeTabId: string | null
  onTabClick: (id: string) => void
  onNewTab: () => void
}

interface Props {
  panel: ActivityPanel
  isOpen: boolean
  onToggle: () => void
  terminal: TerminalData
}

const PANEL_LABELS: Record<ActivityPanel, string> = {
  terminals: 'Terminal',
  workspaces: 'Workspaces',
  search: 'Search',
}

export function Sidebar({ panel, isOpen, onToggle, terminal }: Props) {
  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
      <div className={styles.header}>
        <span className={styles.panelLabel}>{PANEL_LABELS[panel]}</span>
        <button className={styles.closeBtn} onClick={onToggle} title="Close sidebar">
          <PanelCloseIcon size={14} />
        </button>
      </div>

      <div className={styles.content}>
        {panel === 'terminals' && <TerminalsPanel {...terminal} />}
        {panel === 'workspaces' && <WorkspacesPanel />}
        {panel === 'search' && <SearchPanel />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Terminals panel

function TerminalsPanel({ tabs, activeTabId, onTabClick, onNewTab }: TerminalData) {
  return (
    <div className={styles.panel}>
      <Section title="OPEN TERMINALS" defaultOpen>
        <div className={styles.itemList}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tabItem} ${tab.id === activeTabId ? styles.tabItemActive : ''}`}
              onClick={() => onTabClick(tab.id)}
              title={tab.title}
            >
              <span className={styles.tabItemIcon}>
                <TerminalIcon size={13} />
              </span>
              <span className={styles.tabItemLabel}>{tab.title}</span>
              {tab.id === activeTabId && <span className={styles.activeDot} />}
            </button>
          ))}
        </div>
        <button className={styles.addBtn} onClick={onNewTab}>
          <PlusIcon size={13} />
          New Terminal
        </button>
      </Section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Workspaces panel

const PLACEHOLDER_WORKSPACES = ['Default', 'Project Alpha', 'Dotfiles']

function WorkspacesPanel() {
  return (
    <div className={styles.panel}>
      <Section title="WORKSPACES" defaultOpen>
        <div className={styles.itemList}>
          {PLACEHOLDER_WORKSPACES.map((name, i) => (
            <button
              key={name}
              className={`${styles.workspaceItem} ${i === 0 ? styles.workspaceItemActive : ''}`}
            >
              <CircleIcon size={12} />
              <span className={styles.workspaceName}>{name}</span>
            </button>
          ))}
        </div>
        <button className={styles.addBtn}>
          <PlusIcon size={13} />
          New Workspace
        </button>
      </Section>

      <Section title="RECENT" defaultOpen={false}>
        <p className={styles.emptyHint}>No recent workspaces.</p>
      </Section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Search panel

function SearchPanel() {
  const [query, setQuery] = useState('')

  return (
    <div className={styles.panel}>
      <div className={styles.searchBox}>
        <span className={styles.searchIcon}>
          <SearchIcon size={13} />
        </span>
        <input
          className={styles.searchInput}
          placeholder="Search terminals…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <p className={styles.emptyHint}>
        {query ? 'No results.' : 'Type to search across all terminals.'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Collapsible section

interface SectionProps {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}

function Section({ title, defaultOpen = true, children }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={styles.section}>
      <button className={styles.sectionHeader} onClick={() => setOpen((o) => !o)}>
        <span className={styles.sectionChevron}>
          {open ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
        </span>
        <span className={styles.sectionTitle}>{title}</span>
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  )
}
