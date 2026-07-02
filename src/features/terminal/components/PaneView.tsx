import { Fragment, useRef, type MouseEvent as ReactMouseEvent, type RefObject } from 'react'

import { TerminalView } from '../TerminalView'

import styles from './PaneView.module.css'

import type { LayoutStore } from '../layout/LayoutStore'
import type { PaneNode, SplitPane } from '../layout/types'

interface Props {
  node: PaneNode
  activePaneId: string
  store: LayoutStore
}

export function PaneView({ node, activePaneId, store }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  if (node.type === 'terminal') {
    return (
      <div
        className={`${styles.terminalPane} ${node.id === activePaneId ? styles.activePane : ''}`}
        onClick={() => store.focusPane(node.id)}
      >
        <TerminalView
          terminalId={node.terminalId}
          onTitleChange={(title) => store.setPaneTitle(node.id, title)}
          onCwdChange={(cwd) => store.setPaneCwd(node.id, cwd)}
        />
      </div>
    )
  }

  const isHorizontal = node.direction === 'horizontal'

  return (
    <div
      ref={containerRef}
      className={`${styles.split} ${isHorizontal ? styles.horizontal : styles.vertical}`}
    >
      {node.children.map((child, i) => (
        <Fragment key={child.id}>
          <div className={styles.portion} style={{ flex: node.sizes[i] ?? 1 }}>
            <PaneView node={child} activePaneId={activePaneId} store={store} />
          </div>
          {i < node.children.length - 1 && (
            <div
              className={`${styles.handle} ${isHorizontal ? styles.handleH : styles.handleV}`}
              onMouseDown={(e) => startResize(e, i, containerRef, node, store, isHorizontal)}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}

function startResize(
  e: ReactMouseEvent<HTMLDivElement>,
  index: number,
  containerRef: RefObject<HTMLDivElement>,
  node: SplitPane,
  store: LayoutStore,
  isHorizontal: boolean,
): void {
  e.preventDefault()
  e.stopPropagation()
  const container = containerRef.current
  if (!container) return

  const rect = container.getBoundingClientRect()
  const totalPx = isHorizontal ? rect.width : rect.height
  if (totalPx === 0) return

  const startPos = isHorizontal ? e.clientX : e.clientY
  const startSizes = [...node.sizes]
  const a0 = startSizes[index] ?? 1
  const b0 = startSizes[index + 1] ?? 1
  const totalFlex = a0 + b0
  const minFlex = 0.05 * totalFlex

  document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'

  const onMove = (me: MouseEvent) => {
    const delta = (isHorizontal ? me.clientX : me.clientY) - startPos
    const deltaFlex = (delta / totalPx) * totalFlex
    const newA = Math.max(minFlex, a0 + deltaFlex)
    const newB = Math.max(minFlex, a0 + b0 - newA)
    const sizes = [...startSizes]
    sizes[index] = newA
    sizes[index + 1] = newB
    store.resizeSplit(node.id, sizes)
  }

  const onUp = () => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
