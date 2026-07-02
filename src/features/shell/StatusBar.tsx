import styles from './StatusBar.module.css'

interface Props {
  tabCount: number
  activeShell?: string
}

export function StatusBar({ tabCount, activeShell = 'powershell' }: Props) {
  const shellLabel = SHELL_LABELS[activeShell] ?? activeShell

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        <span className={styles.item}>SMux</span>
        <span className={styles.divider} />
        <span className={styles.item}>
          {tabCount} terminal{tabCount !== 1 ? 's' : ''}
        </span>
      </div>

      <div className={styles.right}>
        <span className={styles.item}>{shellLabel}</span>
        <span className={styles.divider} />
        <span className={styles.item}>UTF-8</span>
        <span className={styles.divider} />
        <span className={styles.item}>LF</span>
      </div>
    </div>
  )
}

const SHELL_LABELS: Record<string, string> = {
  powershell: 'PowerShell',
  cmd: 'CMD',
  gitbash: 'Git Bash',
  wsl: 'WSL',
}
