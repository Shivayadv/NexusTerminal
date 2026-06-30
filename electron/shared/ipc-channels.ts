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
  LOG: {
    WRITE: 'log:write',
  },
} as const

type Flatten<T> = T extends string
  ? T
  : { [K in keyof T]: Flatten<T[K]> }[keyof T]

/** Union of every channel string defined above */
export type IpcChannel = Flatten<typeof IPC>
