import type { Logger } from '../../core/logger/Logger'
import type { DatabaseService } from '../DatabaseService'
import { SEED_APP_STATE, SEED_SETTINGS, SEED_WORKSPACES } from './initial-data'

export class SeedRunner {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: Logger,
  ) {}

  run(): void {
    const { count } = this.db.prepare('SELECT COUNT(*) AS count FROM workspaces').get() as { count: number }
    if (count > 0) {
      this.logger.debug('Database already seeded — skipping')
      return
    }

    this.logger.info('Seeding database with initial data')

    this.db.transaction(() => {
      const now = Math.floor(Date.now() / 1000)

      for (const ws of SEED_WORKSPACES) {
        this.db
          .prepare(
            'INSERT INTO workspaces (id, name, description, color, icon, layout_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .run(ws.id, ws.name, ws.description, ws.color, ws.icon, ws.layout_id, now, now)
      }

      for (const s of SEED_SETTINGS) {
        this.db
          .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)')
          .run(s.key, s.value, now)
      }

      for (const a of SEED_APP_STATE) {
        this.db
          .prepare('INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?)')
          .run(a.key, a.value, now)
      }
    })

    this.logger.info('Database seeded')
  }
}
