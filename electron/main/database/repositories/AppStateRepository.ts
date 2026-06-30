import type { DatabaseService } from '../DatabaseService'
import type { AppState } from '../types'
import { BaseRepository } from './BaseRepository'

export class AppStateRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db)
  }

  get(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM app_state WHERE key = ?').get(key) as
      | Pick<AppState, 'value'>
      | undefined
    return row?.value
  }

  set(key: string, value: string): void {
    const now = this.now()
    this.db
      .prepare('INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
      .run(key, value, now)
  }

  delete(key: string): boolean {
    const result = this.db.prepare('DELETE FROM app_state WHERE key = ?').run(key)
    return result.changes > 0
  }

  getAll(): AppState[] {
    return this.db.prepare('SELECT * FROM app_state ORDER BY key ASC').all() as AppState[]
  }
}
