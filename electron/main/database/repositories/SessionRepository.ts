import type { DatabaseService } from '../DatabaseService'
import type { Session } from '../types'
import { BaseRepository } from './BaseRepository'

export interface CreateSessionInput {
  workspace_id?: string | null
  name: string
  shell: string
  cwd?: string | null
  env_overrides?: Record<string, string>
}

export class SessionRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db)
  }

  create(input: CreateSessionInput): Session {
    const id = this.genId()
    const now = this.now()
    const envJson = JSON.stringify(input.env_overrides ?? {})
    this.db
      .prepare(
        'INSERT INTO sessions (id, workspace_id, name, shell, cwd, env_overrides, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, input.workspace_id ?? null, input.name, input.shell, input.cwd ?? null, envJson, 'closed', now, now)
    return this.findById(id) as Session
  }

  findById(id: string): Session | undefined {
    return this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined
  }

  findByWorkspaceId(workspaceId: string): Session[] {
    return this.db
      .prepare('SELECT * FROM sessions WHERE workspace_id = ? ORDER BY created_at ASC')
      .all(workspaceId) as Session[]
  }

  findAll(): Session[] {
    return this.db.prepare('SELECT * FROM sessions ORDER BY created_at ASC').all() as Session[]
  }

  setStatus(id: string, status: Session['status'], pid?: number | null): void {
    const now = this.now()
    this.db
      .prepare('UPDATE sessions SET status = ?, pid = ?, updated_at = ? WHERE id = ?')
      .run(status, pid ?? null, now, id)
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
    return result.changes > 0
  }
}
