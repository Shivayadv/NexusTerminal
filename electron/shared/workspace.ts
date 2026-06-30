/** Workspace as sent over IPC — matches the SQLite row shape exactly. */
export interface WorkspaceDto {
  id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  layout_id: string | null
  last_opened_at: number | null
  created_at: number
  updated_at: number
}

export interface CreateWorkspaceDtoInput {
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
}

export interface ValidationError {
  field: string
  message: string
}

export type WorkspaceChangeEvent =
  | { action: 'created'; workspace: WorkspaceDto }
  | { action: 'updated'; workspace: WorkspaceDto }
  | { action: 'deleted'; id: string }
  | { action: 'opened'; workspace: WorkspaceDto }
  | { action: 'closed'; id: string }
