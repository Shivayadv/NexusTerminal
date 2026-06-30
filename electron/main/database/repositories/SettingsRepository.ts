import type { DatabaseService } from '../DatabaseService'
import type { Setting } from '../types'
import { BaseRepository } from './BaseRepository'

export class SettingsRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db)
  }

  get(key: string): string | undefined {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      | Pick<Setting, 'value'>
      | undefined
    return row?.value
  }

  set(key: string, value: string): void {
    const now = this.now()
    this.db
      .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
      .run(key, value, now)
  }

  delete(key: string): boolean {
    const result = this.db.prepare('DELETE FROM settings WHERE key = ?').run(key)
    return result.changes > 0
  }

  getAll(): Setting[] {
    return this.db.prepare('SELECT * FROM settings ORDER BY key ASC').all() as Setting[]
  }
}
