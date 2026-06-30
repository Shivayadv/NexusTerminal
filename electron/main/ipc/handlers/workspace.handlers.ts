import type { Logger } from '../../core/logger/Logger'
import type { WorkspaceService } from '../../services/WorkspaceService'
import type { CreateWorkspaceDtoInput } from '../../../shared/workspace'
import { IPC } from '../../../shared/ipc-channels'
import type { SecureIpcRouter } from '../SecureIpcRouter'

export function registerWorkspaceHandlers(
  router: SecureIpcRouter,
  workspaceService: WorkspaceService,
  logger: Logger,
): void {
  router.handle(IPC.WORKSPACE.CREATE, (_event, input) =>
    workspaceService.create(input as CreateWorkspaceDtoInput),
  )

  router.handle(IPC.WORKSPACE.DELETE, (_event, id) =>
    workspaceService.delete(id as string),
  )

  router.handle(IPC.WORKSPACE.RENAME, (_event, id, name) =>
    workspaceService.rename(id as string, name as string),
  )

  router.handle(IPC.WORKSPACE.OPEN, (_event, id) =>
    workspaceService.open(id as string),
  )

  router.handle(IPC.WORKSPACE.CLOSE, (_event, id) =>
    workspaceService.close(id as string),
  )

  router.handle(IPC.WORKSPACE.RESTORE, () =>
    workspaceService.restore(),
  )

  router.handle(IPC.WORKSPACE.LIST, () =>
    workspaceService.getAll(),
  )

  router.handle(IPC.WORKSPACE.LIST_RECENT, (_event, limit) =>
    workspaceService.listRecent(typeof limit === 'number' ? limit : undefined),
  )

  router.handle(IPC.WORKSPACE.SEARCH, (_event, query) =>
    workspaceService.search(query as string),
  )

  router.handle(IPC.WORKSPACE.GET_BY_ID, (_event, id) =>
    workspaceService.getById(id as string) ?? null,
  )

  logger.debug('Workspace IPC handlers registered (10 channels)')
}
