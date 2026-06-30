import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { Logger } from '../../core/logger/Logger'
import { MainEventBus } from '../../core/events/MainEventBus'
import { DatabaseService } from '../../database/DatabaseService'
import { AppStateRepository } from '../../database/repositories/AppStateRepository'
import { WorkspaceRepository } from '../../database/repositories/WorkspaceRepository'
import { WorkspaceNotFoundError, WorkspaceService, WorkspaceValidationError } from '../WorkspaceService'

beforeAll(() => Logger.setMinLevel('error'))

function makeService(): { db: DatabaseService; service: WorkspaceService; bus: MainEventBus } {
  const db = new DatabaseService(':memory:', new Logger('Test'))
  db.initialize(false)
  const bus = new MainEventBus()
  const service = new WorkspaceService(
    new WorkspaceRepository(db),
    new AppStateRepository(db),
    bus,
    new Logger('Test'),
  )
  return { db, service, bus }
}

// ---------------------------------------------------------------------------

describe('WorkspaceService.create', () => {
  let db: DatabaseService
  let service: WorkspaceService

  beforeEach(() => ({ db, service } = makeService()))
  afterEach(() => db.close())

  it('creates a workspace with all fields', () => {
    const ws = service.create({ name: 'Alpha', color: '#6366f1', description: 'desc', icon: 'folder' })
    expect(ws.id).toBeTruthy()
    expect(ws.name).toBe('Alpha')
    expect(ws.color).toBe('#6366f1')
    expect(ws.description).toBe('desc')
    expect(ws.icon).toBe('folder')
    expect(ws.last_opened_at).toBeNull()
  })

  it('trims whitespace from name and description', () => {
    const ws = service.create({ name: '  My WS  ', description: '  hello  ' })
    expect(ws.name).toBe('My WS')
    expect(ws.description).toBe('hello')
  })

  it('throws WorkspaceValidationError for empty name', () => {
    expect(() => service.create({ name: '' })).toThrow(WorkspaceValidationError)
    expect(() => service.create({ name: '   ' })).toThrow(WorkspaceValidationError)
  })

  it('throws for name exceeding 100 characters', () => {
    expect(() => service.create({ name: 'a'.repeat(101) })).toThrow(WorkspaceValidationError)
  })

  it('accepts name of exactly 100 characters', () => {
    expect(() => service.create({ name: 'a'.repeat(100) })).not.toThrow()
  })

  it('throws for invalid hex color', () => {
    expect(() => service.create({ name: 'WS', color: 'red' })).toThrow(WorkspaceValidationError)
    expect(() => service.create({ name: 'WS', color: '#gg0000' })).toThrow(WorkspaceValidationError)
    expect(() => service.create({ name: 'WS', color: '#12345' })).toThrow(WorkspaceValidationError)
  })

  it('accepts valid 3 and 6-digit hex colors', () => {
    expect(() => service.create({ name: 'A', color: '#abc' })).not.toThrow()
    expect(() => service.create({ name: 'B', color: '#aabbcc' })).not.toThrow()
  })

  it('throws for description exceeding 500 chars', () => {
    expect(() => service.create({ name: 'WS', description: 'x'.repeat(501) })).toThrow(WorkspaceValidationError)
  })

  it('throws for icon exceeding 50 chars', () => {
    expect(() => service.create({ name: 'WS', icon: 'x'.repeat(51) })).toThrow(WorkspaceValidationError)
  })

  it('emits workspace:created event', () => {
    const { db: d, service: s, bus } = makeService()
    const listener = vi.fn()
    bus.on('workspace:created', listener)
    const ws = s.create({ name: 'Event WS' })
    expect(listener).toHaveBeenCalledWith(ws)
    d.close()
  })
})

// ---------------------------------------------------------------------------

describe('WorkspaceService.delete', () => {
  let db: DatabaseService
  let service: WorkspaceService

  beforeEach(() => ({ db, service } = makeService()))
  afterEach(() => db.close())

  it('deletes an existing workspace', () => {
    const ws = service.create({ name: 'ToDelete' })
    service.delete(ws.id)
    expect(service.getById(ws.id)).toBeUndefined()
  })

  it('throws WorkspaceNotFoundError for unknown id', () => {
    expect(() => service.delete('no-such-id')).toThrow(WorkspaceNotFoundError)
  })

  it('clears the active workspace when deleting it', () => {
    const ws = service.create({ name: 'Active' })
    service.open(ws.id)
    service.delete(ws.id)
    expect(service.restore()).toBeNull()
  })

  it('emits workspace:deleted event', () => {
    const { db: d, service: s, bus } = makeService()
    const listener = vi.fn()
    bus.on('workspace:deleted', listener)
    const ws = s.create({ name: 'Del' })
    s.delete(ws.id)
    expect(listener).toHaveBeenCalledWith({ id: ws.id })
    d.close()
  })
})

// ---------------------------------------------------------------------------

describe('WorkspaceService.rename', () => {
  let db: DatabaseService
  let service: WorkspaceService

  beforeEach(() => ({ db, service } = makeService()))
  afterEach(() => db.close())

  it('renames a workspace', () => {
    const ws = service.create({ name: 'Old' })
    const updated = service.rename(ws.id, 'New')
    expect(updated.name).toBe('New')
    expect(updated.id).toBe(ws.id)
  })

  it('throws for empty name', () => {
    const ws = service.create({ name: 'WS' })
    expect(() => service.rename(ws.id, '')).toThrow(WorkspaceValidationError)
  })

  it('throws WorkspaceNotFoundError for unknown id', () => {
    expect(() => service.rename('no-such', 'Name')).toThrow(WorkspaceNotFoundError)
  })

  it('emits workspace:updated event', () => {
    const { db: d, service: s, bus } = makeService()
    const listener = vi.fn()
    bus.on('workspace:updated', listener)
    const ws = s.create({ name: 'Before' })
    s.rename(ws.id, 'After')
    expect(listener).toHaveBeenCalledOnce()
    expect(listener.mock.calls[0][0].name).toBe('After')
    d.close()
  })
})

// ---------------------------------------------------------------------------

describe('WorkspaceService.open / close / restore', () => {
  let db: DatabaseService
  let service: WorkspaceService

  beforeEach(() => ({ db, service } = makeService()))
  afterEach(() => db.close())

  it('open sets last_opened_at and returns the workspace', () => {
    const ws = service.create({ name: 'WS' })
    expect(ws.last_opened_at).toBeNull()
    const opened = service.open(ws.id)
    expect(opened.last_opened_at).toBeTypeOf('number')
  })

  it('open sets the active workspace', () => {
    const ws = service.create({ name: 'WS' })
    service.open(ws.id)
    const restored = service.restore()
    expect(restored?.id).toBe(ws.id)
  })

  it('open throws for unknown id', () => {
    expect(() => service.open('no-such')).toThrow(WorkspaceNotFoundError)
  })

  it('close clears the active workspace', () => {
    const ws = service.create({ name: 'WS' })
    service.open(ws.id)
    service.close(ws.id)
    expect(service.restore()).toBeNull()
  })

  it('close is a no-op when workspace is not active', () => {
    const ws = service.create({ name: 'WS' })
    expect(() => service.close(ws.id)).not.toThrow()
  })

  it('restore returns null when no workspace was active', () => {
    service.create({ name: 'WS' })
    expect(service.restore()).toBeNull()
  })

  it('restore returns null and clears state if saved id no longer exists', () => {
    const ws = service.create({ name: 'WS' })
    service.open(ws.id)
    service.delete(ws.id)
    expect(service.restore()).toBeNull()
  })

  it('open emits workspace:opened event', () => {
    const { db: d, service: s, bus } = makeService()
    const listener = vi.fn()
    bus.on('workspace:opened', listener)
    const ws = s.create({ name: 'WS' })
    s.open(ws.id)
    expect(listener).toHaveBeenCalledOnce()
    d.close()
  })

  it('close emits workspace:closed event', () => {
    const { db: d, service: s, bus } = makeService()
    const listener = vi.fn()
    bus.on('workspace:closed', listener)
    const ws = s.create({ name: 'WS' })
    s.close(ws.id)
    expect(listener).toHaveBeenCalledWith({ id: ws.id })
    d.close()
  })
})

// ---------------------------------------------------------------------------

describe('WorkspaceService.search', () => {
  let db: DatabaseService
  let service: WorkspaceService

  beforeEach(() => {
    ;({ db, service } = makeService())
    service.create({ name: 'Alpha Terminal', description: 'first workspace' })
    service.create({ name: 'Beta Dev', description: 'development env' })
    service.create({ name: 'Gamma', description: null })
  })
  afterEach(() => db.close())

  it('finds workspaces by name substring', () => {
    const results = service.search('Alpha')
    expect(results).toHaveLength(1)
    expect(results[0]?.name).toBe('Alpha Terminal')
  })

  it('finds workspaces by description substring', () => {
    const results = service.search('development')
    expect(results).toHaveLength(1)
    expect(results[0]?.name).toBe('Beta Dev')
  })

  it('is case-insensitive', () => {
    expect(service.search('alpha')).toHaveLength(1)
    expect(service.search('BETA')).toHaveLength(1)
  })

  it('returns empty array for no match', () => {
    expect(service.search('zzz-no-match')).toHaveLength(0)
  })

  it('returns empty array for blank query', () => {
    expect(service.search('')).toHaveLength(0)
    expect(service.search('   ')).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------

describe('WorkspaceService.listRecent', () => {
  let db: DatabaseService
  let service: WorkspaceService

  beforeEach(() => ({ db, service } = makeService()))
  afterEach(() => db.close())

  it('returns all workspaces', () => {
    service.create({ name: 'A' })
    service.create({ name: 'B' })
    expect(service.listRecent()).toHaveLength(2)
  })

  it('places opened workspaces before never-opened ones', () => {
    const ws1 = service.create({ name: 'Never opened' })
    const ws2 = service.create({ name: 'Opened' })
    service.open(ws2.id)
    const recent = service.listRecent()
    const idxOpened = recent.findIndex((w) => w.id === ws2.id)
    const idxNever = recent.findIndex((w) => w.id === ws1.id)
    expect(idxOpened).toBeLessThan(idxNever)
  })

  it('respects the limit parameter', () => {
    for (let i = 0; i < 5; i++) service.create({ name: `WS${i}` })
    expect(service.listRecent(3)).toHaveLength(3)
  })
})

// ---------------------------------------------------------------------------

describe('WorkspaceService.validate', () => {
  let db: DatabaseService
  let service: WorkspaceService

  beforeEach(() => ({ db, service } = makeService()))
  afterEach(() => db.close())

  it('returns no errors for a valid input', () => {
    expect(service.validate({ name: 'Valid', color: '#abc123' })).toHaveLength(0)
  })

  it('returns error for empty name', () => {
    const errors = service.validate({ name: '' })
    expect(errors.some((e) => e.field === 'name')).toBe(true)
  })

  it('returns error for name over 100 chars', () => {
    const errors = service.validate({ name: 'x'.repeat(101) })
    expect(errors.some((e) => e.field === 'name')).toBe(true)
  })

  it('returns error for invalid color format', () => {
    const errors = service.validate({ name: 'WS', color: 'blue' })
    expect(errors.some((e) => e.field === 'color')).toBe(true)
  })

  it('returns error for description over 500 chars', () => {
    const errors = service.validate({ name: 'WS', description: 'x'.repeat(501) })
    expect(errors.some((e) => e.field === 'description')).toBe(true)
  })

  it('returns error for icon over 50 chars', () => {
    const errors = service.validate({ name: 'WS', icon: 'x'.repeat(51) })
    expect(errors.some((e) => e.field === 'icon')).toBe(true)
  })

  it('allows null for optional fields', () => {
    expect(service.validate({ name: 'WS', color: null, description: null, icon: null })).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------

describe('WorkspaceService.getAll', () => {
  let db: DatabaseService
  let service: WorkspaceService

  beforeEach(() => ({ db, service } = makeService()))
  afterEach(() => db.close())

  it('returns empty array when no workspaces exist', () => {
    expect(service.getAll()).toHaveLength(0)
  })

  it('returns all workspaces ordered by created_at', () => {
    service.create({ name: 'First' })
    service.create({ name: 'Second' })
    service.create({ name: 'Third' })
    const all = service.getAll()
    expect(all).toHaveLength(3)
    expect(all[0]?.name).toBe('First')
    expect(all[2]?.name).toBe('Third')
  })
})
