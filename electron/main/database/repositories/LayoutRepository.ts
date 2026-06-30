import type { DatabaseService } from '../DatabaseService'
import type { Layout } from '../types'
import { BaseRepository } from './BaseRepository'

export interface CreateLayoutInput {
  name: string
  config: object
  is_default?: boolean
}

export class LayoutRepository extends BaseRepository {
  constructor(db: DatabaseService) {
    super(db)
  }

  create(input: CreateLayoutInput): Layout {
    const id = this.genId()
    const now = this.now()
    const isDefault = input.is_default ? 1 : 0
    if (isDefault) this.clearDefault()
    this.db
      .prepare('INSERT INTO layouts (id, name, config, is_default, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, input.name, JSON.stringify(input.config), isDefault, now, now)
    return this.findById(id) as Layout
  }

  findById(id: string): Layout | undefined {
    return this.db.prepare('SELECT * FROM layouts WHERE id = ?').get(id) as Layout | undefined
  }

  findAll(): Layout[] {
    return this.db.prepare('SELECT * FROM layouts ORDER BY created_at ASC').all() as Layout[]
  }

  findDefault(): Layout | undefined {
    return this.db.prepare('SELECT * FROM layouts WHERE is_default = 1 LIMIT 1').get() as Layout | undefined
  }

  setDefault(id: string): void {
    const now = this.now()
    this.db.transaction(() => {
      this.clearDefault()
      this.db.prepare('UPDATE layouts SET is_default = 1, updated_at = ? WHERE id = ?').run(now, id)
    })
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM layouts WHERE id = ?').run(id)
    return result.changes > 0
  }

  private clearDefault(): void {
    this.db.prepare('UPDATE layouts SET is_default = 0 WHERE is_default = 1').run()
  }
}
