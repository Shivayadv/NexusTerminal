import type { CreateWorkspaceDtoInput, WorkspaceChangeEvent, WorkspaceDto } from '@electron/shared/workspace'

/**
 * Renderer-side workspace service — a typed wrapper over the preload bridge.
 * All methods are async (IPC round-trips). Business logic lives in the main process.
 */
export class WorkspaceService {
  create(input: CreateWorkspaceDtoInput): Promise<WorkspaceDto> {
    return window.electron.workspace.create(input)
  }

  delete(id: string): Promise<void> {
    return window.electron.workspace.delete(id)
  }

  rename(id: string, name: string): Promise<WorkspaceDto> {
    return window.electron.workspace.rename(id, name)
  }

  open(id: string): Promise<WorkspaceDto> {
    return window.electron.workspace.open(id)
  }

  close(id: string): Promise<void> {
    return window.electron.workspace.close(id)
  }

  restore(): Promise<WorkspaceDto | null> {
    return window.electron.workspace.restore()
  }

  list(): Promise<WorkspaceDto[]> {
    return window.electron.workspace.list()
  }

  listRecent(limit?: number): Promise<WorkspaceDto[]> {
    return window.electron.workspace.listRecent(limit)
  }

  search(query: string): Promise<WorkspaceDto[]> {
    return window.electron.workspace.search(query)
  }

  getById(id: string): Promise<WorkspaceDto | null> {
    return window.electron.workspace.getById(id)
  }

  onChange(listener: (event: WorkspaceChangeEvent) => void): () => void {
    return window.electron.workspace.onChange(listener)
  }
}
