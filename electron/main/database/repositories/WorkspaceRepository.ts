import type { DatabaseService } from '../DatabaseService'
import type { Workspace } from '../types'
import { BaseRepository } from './BaseRepository'

export interface CreateWorkspaceInput {
  name: string
  description?: string | null
  color?: string | null
  icon?: string | null
  layout_id?: string | null
}

export interface UpdateWorkspaceInput {
  name?: string
  description?: string | null
  color?: string | null
  icon?: string | null
  layout_id?: string | null
}

export class WorkspaceRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db)
  }

  create(input: CreateWorkspaceInput): Workspace {
    const id = this.genId()
    const now = this.now()
    this.db
      .prepare(
        'INSERT INTO workspaces (id, name, description, color, icon, layout_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, input.name, input.description ?? null, input.color ?? null, input.icon ?? null, input.layout_id ?? null, now, now)
    return this.findById(id) as Workspace
  }

  findById(id: string): Workspace | undefined {
    return this.db.prepare('SELECT * FROM workspaces WHERE id = ?').get(id) as Workspace | undefined
  }

  findAll(): Workspace[] {
    return this.db.prepare('SELECT * FROM workspaces ORDER BY created_at ASC').all() as Workspace[]
  }

  /** Most-recently-opened first; workspaces never opened sort last. */
  findRecent(limit = 10): Workspace[] {
    return this.db
      .prepare('SELECT * FROM workspaces ORDER BY last_opened_at DESC, created_at DESC LIMIT ?')
      .all(limit) as Workspace[]
  }

  /** Case-insensitive substring match across name and description. */
  search(query: string): Workspace[] {
    const pattern = `%${query}%`
    return this.db
      .prepare('SELECT * FROM workspaces WHERE name LIKE ? OR description LIKE ? ORDER BY name ASC')
      .all(pattern, pattern) as Workspace[]
  }

  update(id: string, input: UpdateWorkspaceInput): Workspace | undefined {
    const now = this.now()
    const sets: string[] = ['updated_at = ?']
    const params: unknown[] = [now]

    if (input.name !== undefined) { sets.push('name = ?'); params.push(input.name) }
    if ('description' in input) { sets.push('description = ?'); params.push(input.description ?? null) }
    if ('color' in input) { sets.push('color = ?'); params.push(input.color ?? null) }
    if ('icon' in input) { sets.push('icon = ?'); params.push(input.icon ?? null) }
    if ('layout_id' in input) { sets.push('layout_id = ?'); params.push(input.layout_id ?? null) }

    params.push(id)
    this.db.prepare(`UPDATE workspaces SET ${sets.join(', ')} WHERE id = ?`).run(...params)
    return this.findById(id)
  }

  updateLastOpened(id: string): void {
    const now = this.now()
    this.db
      .prepare('UPDATE workspaces SET last_opened_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, id)
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM workspaces WHERE id = ?').run(id)
    return result.changes > 0
  }
}
