import type { Logger } from '../../core/logger/Logger'
import type { DatabaseService } from '../DatabaseService'
import { migration001 } from './001_initial_schema'
import { migration002 } from './002_workspace_last_opened'

export interface Migration {
  version: number
  name: string
  up: string
}

const MIGRATIONS: Migration[] = [migration001, migration002]

export class MigrationRunner {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: Logger,
  ) {}

  run(): void {
    this.ensureVersionTable()
    const current = this.getCurrentVersion()
    const pending = MIGRATIONS.filter((m) => m.version > current).sort((a, b) => a.version - b.version)

    if (pending.length === 0) {
      this.logger.debug('Database schema up to date', { version: current })
      return
    }

    for (const migration of pending) {
      this.logger.info(`Applying migration ${migration.version}: ${migration.name}`)
      this.db.transaction(() => {
        this.db.exec(migration.up)
        this.db
          .prepare('INSERT INTO schema_versions (version, name) VALUES (?, ?)')
          .run(migration.version, migration.name)
      })
      this.logger.info(`Migration ${migration.version} complete`)
    }
  }

  private ensureVersionTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        version    INTEGER PRIMARY KEY,
        name       TEXT    NOT NULL,
        applied_at INTEGER NOT NULL DEFAULT (unixepoch())
      )
    `)
  }

  private getCurrentVersion(): number {
    const row = this.db
      .prepare('SELECT MAX(version) AS version FROM schema_versions')
      .get() as { version: number | null } | undefined
    return row?.version ?? 0
  }
}
