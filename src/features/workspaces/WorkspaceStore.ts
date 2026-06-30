import type { CreateWorkspaceDtoInput, WorkspaceChangeEvent, WorkspaceDto } from '@electron/shared/workspace'

export interface WorkspaceSnapshot {
  workspaces: WorkspaceDto[]
  activeWorkspaceId: string | null
  searchResults: WorkspaceDto[] | null
  loading: boolean
}

type Listener = () => void

/**
 * Observable workspace store for the renderer process.
 *
 * Integrates with React via useSyncExternalStore:
 *   const snap = useSyncExternalStore(store.subscribe, store.getSnapshot)
 *
 * Push events from main (workspace:push-changed) keep the local state in sync
 * without requiring a full reload after every mutation.
 */
export class WorkspaceStore {
  private workspaces: WorkspaceDto[] = []
  private activeWorkspaceId: string | null = null
  private searchResults: WorkspaceDto[] | null = null
  private loading = false
  private readonly listeners = new Set<Listener>()
  private readonly unsubPush: () => void

  constructor() {
    this.unsubPush = window.electron.workspace.onChange((event) => {
      this.applyChange(event)
      this.notify()
    })
  }

  // ---------------------------------------------------------------------------
  // useSyncExternalStore interface

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): WorkspaceSnapshot => ({
    workspaces: this.workspaces,
    activeWorkspaceId: this.activeWorkspaceId,
    searchResults: this.searchResults,
    loading: this.loading,
  })

  // ---------------------------------------------------------------------------
  // Mutations (all update state via push events, not by returning data)

  async load(): Promise<void> {
    this.loading = true
    this.notify()
    try {
      this.workspaces = await window.electron.workspace.list()
      const active = await window.electron.workspace.restore()
      this.activeWorkspaceId = active?.id ?? null
    } finally {
      this.loading = false
      this.notify()
    }
  }

  async create(input: CreateWorkspaceDtoInput): Promise<WorkspaceDto> {
    return window.electron.workspace.create(input)
  }

  async delete(id: string): Promise<void> {
    return window.electron.workspace.delete(id)
  }

  async rename(id: string, name: string): Promise<WorkspaceDto> {
    return window.electron.workspace.rename(id, name)
  }

  async open(id: string): Promise<WorkspaceDto> {
    return window.electron.workspace.open(id)
  }

  async close(id: string): Promise<void> {
    return window.electron.workspace.close(id)
  }

  async search(query: string): Promise<void> {
    if (!query.trim()) {
      this.searchResults = null
      this.notify()
      return
    }
    this.searchResults = await window.electron.workspace.search(query)
    this.notify()
  }

  clearSearch(): void {
    this.searchResults = null
    this.notify()
  }

  // ---------------------------------------------------------------------------
  // Lifecycle

  destroy(): void {
    this.unsubPush()
    this.listeners.clear()
  }

  // ---------------------------------------------------------------------------

  private applyChange(event: WorkspaceChangeEvent): void {
    switch (event.action) {
      case 'created':
        if (!this.workspaces.some((w) => w.id === event.workspace.id)) {
          this.workspaces = [...this.workspaces, event.workspace]
        }
        break
      case 'updated':
        this.workspaces = this.workspaces.map((w) =>
          w.id === event.workspace.id ? event.workspace : w,
        )
        break
      case 'deleted':
        this.workspaces = this.workspaces.filter((w) => w.id !== event.id)
        if (this.activeWorkspaceId === event.id) this.activeWorkspaceId = null
        if (this.searchResults) {
          this.searchResults = this.searchResults.filter((w) => w.id !== event.id)
        }
        break
      case 'opened':
        this.workspaces = this.workspaces.map((w) =>
          w.id === event.workspace.id ? event.workspace : w,
        )
        this.activeWorkspaceId = event.workspace.id
        break
      case 'closed':
        if (this.activeWorkspaceId === event.id) this.activeWorkspaceId = null
        break
    }
  }

  private notify(): void {
    this.listeners.forEach((l) => l())
  }
}
