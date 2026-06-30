import BetterSqlite3 from 'better-sqlite3'

import type { Logger } from '../core/logger/Logger'
import { MigrationRunner } from './migrations'
import { SeedRunner } from './seed'

export interface HealthResult {
  status: 'ok' | 'error'
  latencyMs: number
  walMode: boolean
}

export class DatabaseService {
  private readonly db: BetterSqlite3.Database
  private readonly stmtCache = new Map<string, BetterSqlite3.Statement>()

  constructor(
    private readonly dbPath: string,
    private readonly logger: Logger,
  ) {
    this.db = new BetterSqlite3(dbPath)
    this.configure()
  }

  // ---------------------------------------------------------------------------
  // Configuration

  private configure(): void {
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('synchronous = NORMAL')
    this.db.pragma('temp_store = MEMORY')
    this.db.pragma('mmap_size = 268435456') // 256 MB
    this.logger.info('Database configured', { path: this.dbPath, mode: 'WAL' })
  }

  // ---------------------------------------------------------------------------
  // Core primitives

  /** Return a cached prepared statement — compiles once, reused on subsequent calls. */
  prepare(sql: string): BetterSqlite3.Statement {
    const cached = this.stmtCache.get(sql)
    if (cached) return cached
    const stmt = this.db.prepare(sql)
    this.stmtCache.set(sql, stmt)
    return stmt
  }

  /** Execute a callback inside a single SQLite transaction. Rolls back on throw. */
  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)()
  }

  /** Execute raw multi-statement SQL — used by migrations. */
  exec(sql: string): void {
    this.db.exec(sql)
  }

  // ---------------------------------------------------------------------------
  // Lifecycle

  /** Run pending migrations then optionally seed initial data. */
  initialize(seed = false): void {
    new MigrationRunner(this, this.logger).run()
    if (seed) new SeedRunner(this, this.logger).run()
    this.logger.info('Database initialized')
  }

  health(): HealthResult {
    const start = Date.now()
    try {
      this.db.prepare('SELECT 1').get()
      const mode = this.db.pragma('journal_mode', { simple: true }) as string
      return { status: 'ok', latencyMs: Date.now() - start, walMode: mode === 'wal' }
    } catch {
      return { status: 'error', latencyMs: Date.now() - start, walMode: false }
    }
  }

  close(): void {
    this.db.close()
    this.stmtCache.clear()
    this.logger.info('Database closed')
  }
}
