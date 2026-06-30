import type { MainEventBus } from '../core/events/MainEventBus'
import type { Logger } from '../core/logger/Logger'
import type { AppStateRepository } from '../database/repositories/AppStateRepository'
import type { WorkspaceRepository } from '../database/repositories/WorkspaceRepository'
import type { Workspace } from '../database/types'
import type { CreateWorkspaceDtoInput, ValidationError } from '../../shared/workspace'

const ACTIVE_KEY = 'activeWorkspaceId'

export class WorkspaceValidationError extends Error {
  constructor(public readonly errors: ValidationError[]) {
    super(`Workspace validation failed: ${errors.map((e) => e.message).join(', ')}`)
    this.name = 'WorkspaceValidationError'
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor(id: string) {
    super(`Workspace not found: ${id}`)
    this.name = 'WorkspaceNotFoundError'
  }
}

export class WorkspaceService {
  constructor(
    private readonly workspaceRepo: WorkspaceRepository,
    private readonly appStateRepo: AppStateRepository,
    private readonly eventBus: MainEventBus,
    private readonly logger: Logger,
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD

  create(input: CreateWorkspaceDtoInput): Workspace {
    const errors = this.validate(input)
    if (errors.length) throw new WorkspaceValidationError(errors)
    const workspace = this.workspaceRepo.create({
      ...input,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
    })
    this.eventBus.emit('workspace:created', workspace)
    this.logger.info(`Workspace created: "${workspace.name}"`, { id: workspace.id })
    return workspace
  }

  delete(id: string): void {
    const workspace = this.workspaceRepo.findById(id)
    if (!workspace) throw new WorkspaceNotFoundError(id)
    if (this.appStateRepo.get(ACTIVE_KEY) === id) {
      this.appStateRepo.delete(ACTIVE_KEY)
    }
    this.workspaceRepo.delete(id)
    this.eventBus.emit('workspace:deleted', { id })
    this.logger.info(`Workspace deleted: "${workspace.name}"`, { id })
  }

  rename(id: string, name: string): Workspace {
    const errors = this.validate({ name })
    if (errors.length) throw new WorkspaceValidationError(errors)
    if (!this.workspaceRepo.findById(id)) throw new WorkspaceNotFoundError(id)
    const updated = this.workspaceRepo.update(id, { name: name.trim() }) as Workspace
    this.eventBus.emit('workspace:updated', updated)
    return updated
  }

  // ---------------------------------------------------------------------------
  // Lifecycle

  open(id: string): Workspace {
    if (!this.workspaceRepo.findById(id)) throw new WorkspaceNotFoundError(id)
    this.workspaceRepo.updateLastOpened(id)
    this.appStateRepo.set(ACTIVE_KEY, id)
    const workspace = this.workspaceRepo.findById(id) as Workspace
    this.eventBus.emit('workspace:opened', workspace)
    this.logger.info(`Workspace opened: "${workspace.name}"`, { id })
    return workspace
  }

  close(id: string): void {
    if (this.appStateRepo.get(ACTIVE_KEY) === id) {
      this.appStateRepo.delete(ACTIVE_KEY)
    }
    this.eventBus.emit('workspace:closed', { id })
    this.logger.debug('Workspace closed', { id })
  }

  restore(): Workspace | null {
    const id = this.appStateRepo.get(ACTIVE_KEY)
    if (!id) return null
    if (!this.workspaceRepo.findById(id)) {
      this.appStateRepo.delete(ACTIVE_KEY)
      return null
    }
    return this.open(id)
  }

  // ---------------------------------------------------------------------------
  // Queries

  getAll(): Workspace[] {
    return this.workspaceRepo.findAll()
  }

  listRecent(limit = 10): Workspace[] {
    return this.workspaceRepo.findRecent(limit)
  }

  search(query: string): Workspace[] {
    const trimmed = query.trim()
    if (!trimmed) return []
    return this.workspaceRepo.search(trimmed)
  }

  getById(id: string): Workspace | undefined {
    return this.workspaceRepo.findById(id)
  }

  // ---------------------------------------------------------------------------
  // Validation

  validate(input: Partial<CreateWorkspaceDtoInput>): ValidationError[] {
    const errors: ValidationError[] = []

    if (input.name !== undefined) {
      const trimmed = input.name.trim()
      if (!trimmed) {
        errors.push({ field: 'name', message: 'Name is required' })
      } else if (trimmed.length > 100) {
        errors.push({ field: 'name', message: 'Name must be 100 characters or fewer' })
      }
    }

    if (input.color !== undefined && input.color !== null) {
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(input.color)) {
        errors.push({ field: 'color', message: 'Color must be a valid hex color (#rgb or #rrggbb)' })
      }
    }

    if (
      input.description !== undefined &&
      input.description !== null &&
      input.description.length > 500
    ) {
      errors.push({ field: 'description', message: 'Description must be 500 characters or fewer' })
    }

    if (input.icon !== undefined && input.icon !== null && input.icon.length > 50) {
      errors.push({ field: 'icon', message: 'Icon must be 50 characters or fewer' })
    }

    return errors
  }
}
