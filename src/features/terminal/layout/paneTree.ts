import type { ShellType } from '@electron/shared/terminal'

import type { LayoutSnapshot, PaneNode, SplitPane, Tab, TerminalPane } from './types'

export function newId(): string {
  return crypto.randomUUID()
}

// ---------------------------------------------------------------------------
// Queries

export function findNode(root: PaneNode, id: string): PaneNode | null {
  if (root.id === id) return root
  if (root.type === 'split') {
    for (const child of root.children) {
      const found = findNode(child, id)
      if (found) return found
    }
  }
  return null
}

export function findParent(root: PaneNode, childId: string): SplitPane | null {
  if (root.type !== 'split') return null
  for (const child of root.children) {
    if (child.id === childId) return root
    const found = findParent(child, childId)
    if (found) return found
  }
  return null
}

export function findFirstTerminalPane(root: PaneNode): TerminalPane | null {
  if (root.type === 'terminal') return root
  for (const child of root.children) {
    const found = findFirstTerminalPane(child)
    if (found) return found
  }
  return null
}

export function getAllTerminalPanes(root: PaneNode): TerminalPane[] {
  if (root.type === 'terminal') return [root]
  return root.children.flatMap(getAllTerminalPanes)
}

// ---------------------------------------------------------------------------
// Mutations — all return a new root (immutable)

function replaceNode(root: PaneNode, targetId: string, replacement: PaneNode): PaneNode {
  if (root.id === targetId) return replacement
  if (root.type !== 'split') return root
  return { ...root, children: root.children.map((c) => replaceNode(c, targetId, replacement)) }
}

/**
 * Split paneId into two panes side by side.
 * The original pane stays on the leading side; newPane goes on the trailing side.
 * Returns [newRoot, newPaneId].
 */
export function splitPane(
  root: PaneNode,
  paneId: string,
  direction: 'horizontal' | 'vertical',
  newTerminalId: string,
  shellType: ShellType,
): [PaneNode, string] {
  const target = findNode(root, paneId)
  if (!target || target.type !== 'terminal') return [root, paneId]

  const newPane: TerminalPane = {
    type: 'terminal',
    id: newId(),
    terminalId: newTerminalId,
    title: shellType,
    shellType,
  }

  const split: SplitPane = {
    type: 'split',
    id: newId(),
    direction,
    children: [target, newPane],
    sizes: [1, 1],
  }

  return [replaceNode(root, paneId, split), newPane.id]
}

/**
 * Remove paneId from the tree.
 * If the parent split collapses to one child, that child replaces the split.
 * Returns null if the root itself is removed.
 */
export function closePane(root: PaneNode, paneId: string): PaneNode | null {
  if (root.id === paneId) return null

  if (root.type !== 'split') return root

  const idx = root.children.findIndex((c) => c.id === paneId)
  if (idx !== -1) {
    const remaining = root.children.filter((_, i) => i !== idx)
    if (remaining.length === 1) return remaining[0]!
    const newSizes = root.sizes.filter((_, i) => i !== idx)
    return { ...root, children: remaining, sizes: newSizes }
  }

  const newChildren = root.children.map((c) => closePane(c, paneId)).filter((c): c is PaneNode => c !== null)
  if (newChildren.length === 1) return newChildren[0]!
  return { ...root, children: newChildren }
}

export function updateSizes(root: PaneNode, splitId: string, sizes: number[]): PaneNode {
  if (root.id === splitId && root.type === 'split') return { ...root, sizes }
  if (root.type !== 'split') return root
  return { ...root, children: root.children.map((c) => updateSizes(c, splitId, sizes)) }
}

export function setPaneTitle(root: PaneNode, paneId: string, title: string): PaneNode {
  if (root.id === paneId && root.type === 'terminal') return { ...root, title }
  if (root.type !== 'split') return root
  return { ...root, children: root.children.map((c) => setPaneTitle(c, paneId, title)) }
}

// ---------------------------------------------------------------------------
// Persistence helpers

/** Re-spawn all terminal panes (new terminalIds); pane IDs stay the same. */
export async function respawnLayout(
  snapshot: LayoutSnapshot,
): Promise<LayoutSnapshot> {
  const respawnNode = async (node: PaneNode): Promise<PaneNode> => {
    if (node.type === 'terminal') {
      const dto = await window.electron.terminal.create({ shellType: node.shellType })
      return { ...node, terminalId: dto.id }
    }
    const children = await Promise.all(node.children.map(respawnNode))
    return { ...node, children }
  }

  const tabs: Tab[] = await Promise.all(
    snapshot.tabs.map(async (tab) => ({ ...tab, root: await respawnNode(tab.root) })),
  )

  return {
    tabs,
    activeTabId: snapshot.activeTabId ?? (tabs[0]?.id ?? null),
  }
}
