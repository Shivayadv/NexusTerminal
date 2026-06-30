/**
 * Single source of truth for every IPC channel string.
 * Imported by both main/ipc handlers and the preload bridge so channel
 * names can never silently drift apart.
 */
export const IPC = {
  APP: {
    GET_VERSION: 'app:get-version',
    GET_PLATFORM: 'app:get-platform',
    GET_ENVIRONMENT: 'app:get-environment',
  },
  WORKSPACE: {
    CREATE: 'workspace:create',
    DELETE: 'workspace:delete',
    RENAME: 'workspace:rename',
    OPEN: 'workspace:open',
    CLOSE: 'workspace:close',
    RESTORE: 'workspace:restore',
    LIST: 'workspace:list',
    LIST_RECENT: 'workspace:list-recent',
    SEARCH: 'workspace:search',
    GET_BY_ID: 'workspace:get-by-id',
    PUSH_CHANGED: 'workspace:push-changed',
  },
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    UNMAXIMIZE: 'window:unmaximize',
    CLOSE: 'window:close',
    IS_MAXIMIZED: 'window:is-maximized',
    SET_TITLE: 'window:set-title',
    // Push events: main → renderer
    PUSH_MAXIMIZED: 'window:push-maximized',
    PUSH_UNMAXIMIZED: 'window:push-unmaximized',
  },
  CONFIG: {
    GET: 'config:get',
    SET: 'config:set',
    RESET: 'config:reset',
    // Push event: main → renderer
    PUSH_CHANGED: 'config:push-changed',
  },
  TERMINAL: {
    CREATE: 'terminal:create',
    KILL: 'terminal:kill',
    LIST: 'terminal:list',
    INPUT: 'terminal:input',
    RESIZE: 'terminal:resize',
    // Push: main → renderer
    PUSH_DATA: 'terminal:push-data',
    PUSH_EXIT: 'terminal:push-exit',
  },
  LOG: {
    WRITE: 'log:write',
  },
} as const

type Flatten<T> = T extends string
  ? T
  : { [K in keyof T]: Flatten<T[K]> }[keyof T]

/** Union of every channel string defined above */
export type IpcChannel = Flatten<typeof IPC>
