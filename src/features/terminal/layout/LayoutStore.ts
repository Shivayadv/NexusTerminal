
import { evictTerminal, queueScrollback, serializeBuffer } from '../terminalCache'

import * as tree from './paneTree'

import type { LayoutSnapshot, PaneNode, Tab, TerminalPane } from './types'
import type { ShellType } from '@electron/shared/terminal'

const STORAGE_KEY = 'nexus:terminalLayout'

type Listener = () => void

export class LayoutStore {
  private state: LayoutSnapshot = { tabs: [], activeTabId: null }
  private readonly listeners = new Set<Listener>()
  private _initialized = false

  // ---------------------------------------------------------------------------
  // useSyncExternalStore interface

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): LayoutSnapshot => this.state

  isInitialized(): boolean {
    return this._initialized
  }

  // ---------------------------------------------------------------------------
  // Initialise — restore persisted layout or create first tab

  async initialize(): Promise<void> {
    if (this._initialized) return
    this._initialized = true

    window.addEventListener('beforeunload', () => this.captureScrollback())

    const saved = this.loadRaw()
    if (saved && saved.tabs.length > 0) {
      // Collect scrollback from the saved snapshot before respawning (new terminalIds)
      const savedScrollbacks = this.collectScrollbacks(saved)

      this.state = await tree.respawnLayout(saved)

      // Queue scrollback for replay when each TerminalView mounts
      const liveTerminalIds = this.collectTerminalIds(this.state)
      for (const [paneId, scrollback] of savedScrollbacks) {
        const terminalId = liveTerminalIds.get(paneId)
        if (terminalId) queueScrollback(terminalId, scrollback)
      }

      // Clear scrollback from state (captureScrollback on next quit will write fresh ones)
      this.state = { ...this.state, tabs: this.state.tabs.map((t) => ({ ...t, root: this.clearScrollback(t.root) })) }
      this.persist()
      this.notify()
    } else {
      await this.createTab('powershell')
    }
  }

  // ---------------------------------------------------------------------------
  // Tab operations

  async createTab(shellType: ShellType = 'powershell', cwd?: string): Promise<void> {
    const dto = await window.electron.terminal.create({ shellType, ...(cwd ? { cwd } : {}) })
    const pane: TerminalPane = {
      type: 'terminal',
      id: tree.newId(),
      terminalId: dto.id,
      title: shellType,
      shellType,
    }
    const tab: Tab = {
      id: tree.newId(),
      title: shellType,
      root: pane,
      activePaneId: pane.id,
    }
    this.state = { tabs: [...this.state.tabs, tab], activeTabId: tab.id }
    this.commit()
  }

  async closeTab(tabId: string): Promise<void> {
    const tab = this.state.tabs.find((t) => t.id === tabId)
    if (!tab) return

    const terminals = tree.getAllTerminalPanes(tab.root)
    await Promise.all(terminals.map(async (p) => {
      evictTerminal(p.terminalId)
      await window.electron.terminal.kill(p.terminalId).catch(() => undefined)
    }))

    const remaining = this.state.tabs.filter((t) => t.id !== tabId)
    const activeTabId =
      this.state.activeTabId === tabId
        ? (remaining.at(-1)?.id ?? null)
        : this.state.activeTabId

    this.state = { tabs: remaining, activeTabId }
    this.commit()

    if (remaining.length === 0) await this.createTab('powershell')
  }

  renameTab(tabId: string, title: string): void {
    this.state = {
      ...this.state,
      tabs: this.state.tabs.map((t) => (t.id === tabId ? { ...t, title } : t)),
    }
    this.commit()
  }

  async duplicateTab(tabId: string): Promise<void> {
    const src = this.state.tabs.find((t) => t.id === tabId)
    if (!src) return
    const active = tree.findNode(src.root, src.activePaneId)
    const shellType = active?.type === 'terminal' ? active.shellType : 'powershell'
    const cwd = active?.type === 'terminal' ? active.cwd : undefined
    await this.createTab(shellType, cwd)
  }

  setActiveTab(tabId: string): void {
    this.state = { ...this.state, activeTabId: tabId }
    this.commit()
  }

  // ---------------------------------------------------------------------------
  // Pane operations

  async splitPane(paneId: string, direction: 'horizontal' | 'vertical'): Promise<void> {
    const tab = this.activeTab()
    if (!tab) return
    const pane = tree.findNode(tab.root, paneId)
    if (!pane || pane.type !== 'terminal') return

    const dto = await window.electron.terminal.create({ shellType: pane.shellType })
    const [newRoot, newPaneId] = tree.splitPane(tab.root, paneId, direction, dto.id, pane.shellType)
    this.updateTab(tab.id, { root: newRoot, activePaneId: newPaneId })
  }

  async closePane(paneId: string): Promise<void> {
    const tab = this.activeTab()
    if (!tab) return
    const pane = tree.findNode(tab.root, paneId)
    if (!pane || pane.type !== 'terminal') return

    evictTerminal(pane.terminalId)
    await window.electron.terminal.kill(pane.terminalId).catch(() => undefined)
    const newRoot = tree.closePane(tab.root, paneId)

    if (!newRoot) {
      await this.closeTab(tab.id)
      return
    }

    const first = tree.findFirstTerminalPane(newRoot)
    this.updateTab(tab.id, { root: newRoot, activePaneId: first?.id ?? tab.activePaneId })
  }

  focusPane(paneId: string): void {
    const tab = this.activeTab()
    if (!tab) return
    this.updateTab(tab.id, { activePaneId: paneId })
  }

  resizeSplit(splitId: string, sizes: number[]): void {
    const tab = this.activeTab()
    if (!tab) return
    this.updateTab(tab.id, { root: tree.updateSizes(tab.root, splitId, sizes) })
  }

  setPaneTitle(paneId: string, title: string): void {
    const tab = this.activeTab()
    if (!tab) return
    const newRoot = tree.setPaneTitle(tab.root, paneId, title)
    const tabTitle = tab.activePaneId === paneId ? title : tab.title
    this.updateTab(tab.id, { root: newRoot, title: tabTitle })
  }

  /** Called by TerminalView when it detects an OSC 7 CWD change sequence. */
  setPaneCwd(paneId: string, cwd: string): void {
    let changed = false
    const tabs = this.state.tabs.map((tab) => {
      const newRoot = tree.setPaneCwd(tab.root, paneId, cwd)
      if (newRoot === tab.root) return tab
      changed = true
      return { ...tab, root: newRoot }
    })
    if (!changed) return
    this.state = { ...this.state, tabs }
    this.persist() // persist silently — no re-render needed
  }

  // ---------------------------------------------------------------------------

  private activeTab(): Tab | undefined {
    return this.state.tabs.find((t) => t.id === this.state.activeTabId)
  }

  private updateTab(tabId: string, updates: Partial<Tab>): void {
    this.state = {
      ...this.state,
      tabs: this.state.tabs.map((t) => (t.id === tabId ? { ...t, ...updates } : t)),
    }
    this.commit()
  }

  /** Serialize xterm buffers into the stored layout right before the window closes. */
  private captureScrollback(): void {
    const tabs = this.state.tabs.map((tab) => ({
      ...tab,
      root: this.snapshotScrollback(tab.root),
    }))
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...this.state, tabs }))
    } catch { /* storage full */ }
  }

  private snapshotScrollback(node: PaneNode): PaneNode {
    if (node.type === 'terminal') {
      const scrollback = serializeBuffer(node.terminalId)
      return scrollback ? { ...node, scrollback } : node
    }
    return { ...node, children: node.children.map((c) => this.snapshotScrollback(c)) }
  }

  private clearScrollback(node: PaneNode): PaneNode {
    if (node.type === 'terminal') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { scrollback: _drop, ...rest } = node
      return rest as PaneNode
    }
    return { ...node, children: node.children.map((c) => this.clearScrollback(c)) }
  }

  private collectScrollbacks(snapshot: LayoutSnapshot): Map<string, string> {
    const map = new Map<string, string>()
    for (const tab of snapshot.tabs) this.walkScrollbacks(tab.root, map)
    return map
  }

  private walkScrollbacks(node: PaneNode, map: Map<string, string>): void {
    if (node.type === 'terminal') { if (node.scrollback) map.set(node.id, node.scrollback); return }
    for (const child of node.children) this.walkScrollbacks(child, map)
  }

  private collectTerminalIds(snapshot: LayoutSnapshot): Map<string, string> {
    const map = new Map<string, string>()
    for (const tab of snapshot.tabs) this.walkTerminalIds(tab.root, map)
    return map
  }

  private walkTerminalIds(node: PaneNode, map: Map<string, string>): void {
    if (node.type === 'terminal') { map.set(node.id, node.terminalId); return }
    for (const child of node.children) this.walkTerminalIds(child, map)
  }

  private commit(): void {
    this.persist()
    this.notify()
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn())
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch {
      // storage full
    }
  }

  private loadRaw(): LayoutSnapshot | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as LayoutSnapshot) : null
    } catch {
      return null
    }
  }
}
