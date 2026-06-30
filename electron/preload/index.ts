import { contextBridge, ipcRenderer } from 'electron'

import type { AppConfigSchema } from '../shared/config-schema'
import { IPC } from '../shared/ipc-channels'

// ---------------------------------------------------------------------------
// Helpers

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>
}

function send(channel: string, ...args: unknown[]): void {
  ipcRenderer.send(channel, ...args)
}

/** Subscribe to a push event from main; returns an unsubscribe function */
function onPush(channel: string, listener: (...args: unknown[]) => void): () => void {
  const sub = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => listener(...args)
  ipcRenderer.on(channel, sub)
  return () => ipcRenderer.removeListener(channel, sub)
}

// ---------------------------------------------------------------------------
// API surface exposed to the renderer

const electronAPI = {
  app: {
    getVersion: (): Promise<string> => invoke<string>(IPC.APP.GET_VERSION),
    getPlatform: (): Promise<NodeJS.Platform> => invoke<NodeJS.Platform>(IPC.APP.GET_PLATFORM),
    getEnvironment: (): Promise<'development' | 'production'> =>
      invoke<'development' | 'production'>(IPC.APP.GET_ENVIRONMENT),
  },

  window: {
    minimize: (): Promise<void> => invoke<void>(IPC.WINDOW.MINIMIZE),
    maximize: (): Promise<void> => invoke<void>(IPC.WINDOW.MAXIMIZE),
    unmaximize: (): Promise<void> => invoke<void>(IPC.WINDOW.UNMAXIMIZE),
    close: (): Promise<void> => invoke<void>(IPC.WINDOW.CLOSE),
    isMaximized: (): Promise<boolean> => invoke<boolean>(IPC.WINDOW.IS_MAXIMIZED),
    setTitle: (title: string): Promise<void> => invoke<void>(IPC.WINDOW.SET_TITLE, title),

    onMaximized: (listener: () => void): (() => void) =>
      onPush(IPC.WINDOW.PUSH_MAXIMIZED, listener),
    onUnmaximized: (listener: () => void): (() => void) =>
      onPush(IPC.WINDOW.PUSH_UNMAXIMIZED, listener),
  },

  config: {
    get: <K extends keyof AppConfigSchema>(key: K): Promise<AppConfigSchema[K]> =>
      invoke<AppConfigSchema[K]>(IPC.CONFIG.GET, key),
    set: <K extends keyof AppConfigSchema>(key: K, value: AppConfigSchema[K]): Promise<void> =>
      invoke<void>(IPC.CONFIG.SET, key, value),
    reset: (): Promise<void> => invoke<void>(IPC.CONFIG.RESET),
    onChange: (listener: (key: string, value: unknown) => void): (() => void) =>
      onPush(IPC.CONFIG.PUSH_CHANGED, listener as (...args: unknown[]) => void),
  },

  log: {
    write: (
      level: 'debug' | 'info' | 'warn' | 'error',
      context: string,
      message: string,
      data?: unknown,
    ): void => send(IPC.LOG.WRITE, { level, context, message, data }),
  },
} as const

contextBridge.exposeInMainWorld('electron', electronAPI)

export type ElectronAPI = typeof electronAPI
