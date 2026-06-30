import type { ShellType } from '@electron/shared/terminal'

import * as tree from './paneTree'
import type { LayoutSnapshot, Tab, TerminalPane } from './types'

const STORAGE_KEY = 'nexus:terminalLayout'

type Listener = () => void

export class LayoutStore {
  private state: LayoutSnapshot = { tabs: [], activeTabId: null }
  private readonly listeners = new Set<Listener>()

  // ---------------------------------------------------------------------------
  // useSyncExternalStore interface

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): LayoutSnapshot => this.state

  // ---------------------------------------------------------------------------
  // Initialise — restore persisted layout or create first tab

  async initialize(): Promise<void> {
    const saved = this.loadRaw()
    if (saved && saved.tabs.length > 0) {
      this.state = await tree.respawnLayout(saved)
      this.persist()
      this.notify()
    } else {
      await this.createTab('powershell')
    }
  }

  // ---------------------------------------------------------------------------
  // Tab operations

  async createTab(shellType: ShellType = 'powershell'): Promise<void> {
    const dto = await window.electron.terminal.create({ shellType })
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
    await Promise.all(terminals.map((p) => window.electron.terminal.kill(p.terminalId).catch(() => {})))

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
    await this.createTab(shellType)
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

    await window.electron.terminal.kill(pane.terminalId).catch(() => {})
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
