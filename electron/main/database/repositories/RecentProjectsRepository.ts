import type { DatabaseService } from '../DatabaseService'
import type { RecentProject } from '../types'
import { BaseRepository } from './BaseRepository'

export class RecentProjectsRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db)
  }

  track(projectPath: string, name: string): RecentProject {
    const now = this.now()
    const existing = this.findByPath(projectPath)

    if (existing) {
      this.db
        .prepare('UPDATE recent_projects SET name = ?, last_opened_at = ?, open_count = open_count + 1 WHERE id = ?')
        .run(name, now, existing.id)
      return this.findById(existing.id) as RecentProject
    }

    const id = this.genId()
    this.db
      .prepare('INSERT INTO recent_projects (id, path, name, last_opened_at, open_count) VALUES (?, ?, ?, ?, 1)')
      .run(id, projectPath, name, now)
    return this.findById(id) as RecentProject
  }

  findById(id: string): RecentProject | undefined {
    return this.db.prepare('SELECT * FROM recent_projects WHERE id = ?').get(id) as RecentProject | undefined
  }

  findByPath(projectPath: string): RecentProject | undefined {
    return this.db.prepare('SELECT * FROM recent_projects WHERE path = ?').get(projectPath) as
      | RecentProject
      | undefined
  }

  findRecent(limit = 10): RecentProject[] {
    return this.db
      .prepare('SELECT * FROM recent_projects ORDER BY last_opened_at DESC LIMIT ?')
      .all(limit) as RecentProject[]
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM recent_projects WHERE id = ?').run(id)
    return result.changes > 0
  }

  clear(): void {
    this.db.prepare('DELETE FROM recent_projects').run()
  }
}
