import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { Logger } from '../../core/logger/Logger'
import { DatabaseService } from '../DatabaseService'
import { AppStateRepository } from '../repositories/AppStateRepository'
import { LayoutRepository } from '../repositories/LayoutRepository'
import { RecentProjectsRepository } from '../repositories/RecentProjectsRepository'
import { SessionRepository } from '../repositories/SessionRepository'
import { SettingsRepository } from '../repositories/SettingsRepository'
import { WorkspaceRepository } from '../repositories/WorkspaceRepository'

// Suppress logger output during tests
beforeAll(() => Logger.setMinLevel('error'))

// ---------------------------------------------------------------------------
// Helpers

function makeDb(): DatabaseService {
  const db = new DatabaseService(':memory:', new Logger('Test'))
  db.initialize(false)
  return db
}

// ---------------------------------------------------------------------------

describe('DatabaseService', () => {
  let db: DatabaseService

  beforeEach(() => { db = makeDb() })
  afterEach(() => { db.close() })

  it('health check returns ok', () => {
    const h = db.health()
    expect(h.status).toBe('ok')
    expect(typeof h.latencyMs).toBe('number')
  })

  it('caches prepared statements — same SQL returns same object', () => {
    const sql = 'SELECT 1'
    expect(db.prepare(sql)).toBe(db.prepare(sql))
  })

  it('rolls back a transaction on throw', () => {
    expect(() =>
      db.transaction(() => {
        const now = Math.floor(Date.now() / 1000)
        db.prepare('INSERT INTO workspaces (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run('ws-x', 'X', now, now)
        throw new Error('rollback me')
      }),
    ).toThrow('rollback me')
    const row = db.prepare('SELECT COUNT(*) AS n FROM workspaces').get() as { n: number }
    expect(row.n).toBe(0)
  })
})

// ---------------------------------------------------------------------------

describe('WAL mode', () => {
  const tmpPath = path.join(os.tmpdir(), `nexus-wal-${Date.now()}.db`)
  let fileDb: DatabaseService

  beforeAll(() => {
    fileDb = new DatabaseService(tmpPath, new Logger('Test'))
    fileDb.initialize()
  })

  afterAll(() => {
    fileDb.close()
    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)
  })

  it('file-backed database uses WAL mode', () => {
    expect(fileDb.health().walMode).toBe(true)
  })
})

// ---------------------------------------------------------------------------

describe('MigrationRunner', () => {
  let db: DatabaseService

  beforeEach(() => { db = makeDb() })
  afterEach(() => { db.close() })

  const EXPECTED_TABLES = ['workspaces', 'sessions', 'settings', 'layouts', 'recent_projects', 'app_state', 'schema_versions']

  it('creates all required tables', () => {
    for (const table of EXPECTED_TABLES) {
      const row = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(table) as { name: string } | undefined
      expect(row?.name, `table "${table}" should exist`).toBe(table)
    }
  })

  it('records schema version 1', () => {
    const row = db.prepare('SELECT version FROM schema_versions WHERE version = 1').get() as
      | { version: number }
      | undefined
    expect(row?.version).toBe(1)
  })

  it('re-running initialize is idempotent', () => {
    expect(() => db.initialize(false)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------

describe('WorkspaceRepository', () => {
  let db: DatabaseService
  let repo: WorkspaceRepository

  beforeEach(() => { db = makeDb(); repo = new WorkspaceRepository(db) })
  afterEach(() => { db.close() })

  it('creates and retrieves a workspace', () => {
    const ws = repo.create({ name: 'My Workspace', color: '#ff0000' })
    expect(ws.id).toBeTruthy()
    expect(ws.name).toBe('My Workspace')
    expect(ws.color).toBe('#ff0000')
    expect(ws.description).toBeNull()
    expect(repo.findById(ws.id)).toEqual(ws)
  })

  it('findAll returns all workspaces', () => {
    repo.create({ name: 'A' })
    repo.create({ name: 'B' })
    expect(repo.findAll()).toHaveLength(2)
  })

  it('updates fields', () => {
    const ws = repo.create({ name: 'Old' })
    const updated = repo.update(ws.id, { name: 'New', description: 'Desc' })
    expect(updated?.name).toBe('New')
    expect(updated?.description).toBe('Desc')
  })

  it('delete removes the workspace and returns true', () => {
    const ws = repo.create({ name: 'ToDelete' })
    expect(repo.delete(ws.id)).toBe(true)
    expect(repo.findById(ws.id)).toBeUndefined()
  })

  it('delete returns false for non-existent id', () => {
    expect(repo.delete('no-such-id')).toBe(false)
  })
})

// ---------------------------------------------------------------------------

describe('SessionRepository', () => {
  let db: DatabaseService
  let sessionRepo: SessionRepository
  let workspaceRepo: WorkspaceRepository

  beforeEach(() => {
    db = makeDb()
    sessionRepo = new SessionRepository(db)
    workspaceRepo = new WorkspaceRepository(db)
  })
  afterEach(() => { db.close() })

  it('creates and retrieves a session', () => {
    const s = sessionRepo.create({ name: 'bash', shell: '/bin/bash' })
    expect(s.id).toBeTruthy()
    expect(s.shell).toBe('/bin/bash')
    expect(s.status).toBe('closed')
    expect(sessionRepo.findById(s.id)).toEqual(s)
  })

  it('findByWorkspaceId scopes results', () => {
    const ws = workspaceRepo.create({ name: 'WS' })
    sessionRepo.create({ name: 's1', shell: 'bash', workspace_id: ws.id })
    sessionRepo.create({ name: 's2', shell: 'zsh', workspace_id: ws.id })
    sessionRepo.create({ name: 's3', shell: 'sh' })
    expect(sessionRepo.findByWorkspaceId(ws.id)).toHaveLength(2)
  })

  it('setStatus updates status and pid', () => {
    const s = sessionRepo.create({ name: 'run', shell: 'bash' })
    sessionRepo.setStatus(s.id, 'active', 1234)
    const updated = sessionRepo.findById(s.id)
    expect(updated?.status).toBe('active')
    expect(updated?.pid).toBe(1234)
  })
})

// ---------------------------------------------------------------------------

describe('SettingsRepository', () => {
  let db: DatabaseService
  let repo: SettingsRepository

  beforeEach(() => { db = makeDb(); repo = new SettingsRepository(db) })
  afterEach(() => { db.close() })

  it('set and get a value', () => {
    repo.set('theme', 'dark')
    expect(repo.get('theme')).toBe('dark')
  })

  it('upserts — second set replaces value', () => {
    repo.set('fontSize', '14')
    repo.set('fontSize', '16')
    expect(repo.get('fontSize')).toBe('16')
  })

  it('get returns undefined for missing key', () => {
    expect(repo.get('missing')).toBeUndefined()
  })

  it('delete removes key', () => {
    repo.set('temp', 'x')
    expect(repo.delete('temp')).toBe(true)
    expect(repo.get('temp')).toBeUndefined()
  })

  it('getAll returns all settings', () => {
    repo.set('a', '1')
    repo.set('b', '2')
    const all = repo.getAll()
    expect(all).toHaveLength(2)
    expect(all.map((s) => s.key).sort()).toEqual(['a', 'b'])
  })
})

// ---------------------------------------------------------------------------

describe('LayoutRepository', () => {
  let db: DatabaseService
  let repo: LayoutRepository

  beforeEach(() => { db = makeDb(); repo = new LayoutRepository(db) })
  afterEach(() => { db.close() })

  it('creates and retrieves a layout', () => {
    const l = repo.create({ name: 'Two-Pane', config: { split: 'horizontal' } })
    expect(l.id).toBeTruthy()
    expect(l.name).toBe('Two-Pane')
    expect(l.config).toBe('{"split":"horizontal"}')
    expect(repo.findById(l.id)).toEqual(l)
  })

  it('setDefault updates which layout is default', () => {
    const a = repo.create({ name: 'A', config: {} })
    const b = repo.create({ name: 'B', config: {} })
    repo.setDefault(a.id)
    expect(repo.findDefault()?.id).toBe(a.id)
    repo.setDefault(b.id)
    expect(repo.findDefault()?.id).toBe(b.id)
    expect(repo.findById(a.id)?.is_default).toBe(0)
  })

  it('findDefault returns undefined when no default is set', () => {
    repo.create({ name: 'L', config: {} })
    expect(repo.findDefault()).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------

describe('RecentProjectsRepository', () => {
  let db: DatabaseService
  let repo: RecentProjectsRepository

  beforeEach(() => { db = makeDb(); repo = new RecentProjectsRepository(db) })
  afterEach(() => { db.close() })

  it('track inserts a new project', () => {
    const rp = repo.track('/home/user/project', 'MyProject')
    expect(rp.path).toBe('/home/user/project')
    expect(rp.open_count).toBe(1)
  })

  it('track increments open_count on repeat', () => {
    repo.track('/home/user/project', 'MyProject')
    const rp = repo.track('/home/user/project', 'MyProject')
    expect(rp.open_count).toBe(2)
  })

  it('findRecent returns projects sorted by last_opened_at desc', () => {
    repo.track('/a', 'A')
    repo.track('/b', 'B')
    repo.track('/a', 'A')
    const recents = repo.findRecent(5)
    expect(recents[0]?.path).toBe('/a')
  })

  it('clear removes all entries', () => {
    repo.track('/x', 'X')
    repo.clear()
    expect(repo.findRecent()).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------

describe('AppStateRepository', () => {
  let db: DatabaseService
  let repo: AppStateRepository

  beforeEach(() => { db = makeDb(); repo = new AppStateRepository(db) })
  afterEach(() => { db.close() })

  it('set and get a state value', () => {
    repo.set('activeWorkspace', 'ws-1')
    expect(repo.get('activeWorkspace')).toBe('ws-1')
  })

  it('upserts on second set', () => {
    repo.set('window.width', '1200')
    repo.set('window.width', '1400')
    expect(repo.get('window.width')).toBe('1400')
  })

  it('delete removes key', () => {
    repo.set('tmp', 'v')
    expect(repo.delete('tmp')).toBe(true)
    expect(repo.get('tmp')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------

describe('SeedRunner', () => {
  it('seed creates default workspace', () => {
    const db = new DatabaseService(':memory:', new Logger('Test'))
    db.initialize(true)
    const row = db.prepare('SELECT id, name FROM workspaces WHERE id = ?').get('ws-default') as
      | { id: string; name: string }
      | undefined
    expect(row?.name).toBe('Default')
    db.close()
  })

  it('seeding is idempotent', () => {
    const db = new DatabaseService(':memory:', new Logger('Test'))
    db.initialize(true)
    expect(() => db.initialize(true)).not.toThrow()
    const row = db.prepare('SELECT COUNT(*) AS n FROM workspaces').get() as { n: number }
    expect(row.n).toBe(1)
    db.close()
  })

  it('seed populates default settings', () => {
    const db = new DatabaseService(':memory:', new Logger('Test'))
    db.initialize(true)
    const theme = db.prepare('SELECT value FROM settings WHERE key = ?').get('theme') as
      | { value: string }
      | undefined
    expect(theme?.value).toBe('dark')
    db.close()
  })
})
