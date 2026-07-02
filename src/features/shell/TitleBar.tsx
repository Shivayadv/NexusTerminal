import { NexusLogoIcon } from './icons'
import styles from './TitleBar.module.css'

export function TitleBar() {
  return (
    <div className={styles.bar}>
      <div className={styles.drag}>
        <div className={styles.brand}>
          <NexusLogoIcon size={15} />
          <span className={styles.name}>SMux</span>
        </div>
      </div>
    </div>
  )
}
