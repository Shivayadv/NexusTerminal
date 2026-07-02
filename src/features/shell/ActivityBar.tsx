
import styles from './ActivityBar.module.css'
import { FolderIcon, SearchIcon, SettingsIcon, TerminalIcon } from './icons'

import type { ReactNode } from 'react'

export type ActivityPanel = 'terminals' | 'workspaces' | 'search'

interface Props {
  active: ActivityPanel
  onChange: (panel: ActivityPanel) => void
  onSettingsClick: () => void
}

export function ActivityBar({ active, onChange, onSettingsClick }: Props) {
  const handleClick = (panel: ActivityPanel) => onChange(panel)

  return (
    <div className={styles.bar}>
      <div className={styles.top}>
        <ActivityItem id="terminals" label="Terminal" active={active} onClick={handleClick}>
          <TerminalIcon />
        </ActivityItem>
        <ActivityItem id="workspaces" label="Workspaces" active={active} onClick={handleClick}>
          <FolderIcon />
        </ActivityItem>
        <ActivityItem id="search" label="Search" active={active} onClick={handleClick}>
          <SearchIcon />
        </ActivityItem>
      </div>

      <div className={styles.bottom}>
        <button className={styles.item} title="Settings (Ctrl+,)" onClick={onSettingsClick}>
          <SettingsIcon />
        </button>
      </div>
    </div>
  )
}

interface ItemProps {
  id: ActivityPanel
  label: string
  active: ActivityPanel
  onClick: (id: ActivityPanel) => void
  children: ReactNode
}

function ActivityItem({ id, label, active, onClick, children }: ItemProps) {
  const isActive = active === id
  return (
    <button
      className={`${styles.item} ${isActive ? styles.active : ''}`}
      title={label}
      onClick={() => onClick(id)}
    >
      {isActive && <span className={styles.indicator} />}
      {children}
    </button>
  )
}
