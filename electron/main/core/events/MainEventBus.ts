import type { AppConfigSchema } from '../../../shared/config-schema'
import type { Workspace } from '../../database/types'
import type { ShellType } from '../../../shared/terminal'

/** Typed event catalogue for all inter-service communication in the main process */
export interface MainEvents {
  // App lifecycle
  'app:ready': undefined
  'app:before-quit': undefined
  'app:will-quit': undefined

  // Window lifecycle
  'window:created': { id: number; label: string }
  'window:closed': { id: number }
  'window:focused': { id: number }
  'window:blurred': { id: number }
  'window:maximized': { id: number }
  'window:unmaximized': { id: number }
  'window:resized': { id: number; width: number; height: number }
  'window:moved': { id: number; x: number; y: number }

  // Config
  'config:changed': { key: keyof AppConfigSchema; value: unknown }
  'config:reset': undefined

  // Workspace
  'workspace:created': Workspace
  'workspace:updated': Workspace
  'workspace:deleted': { id: string }
  'workspace:opened': Workspace
  'workspace:closed': { id: string }

  // Terminal
  'terminal:created': { id: string; pid: number; shellType: ShellType }
  'terminal:killed': { id: string }
  'terminal:exited': { id: string; code: number }

  // Error surface
  'error:uncaught': { error: Error }
  'error:unhandled-rejection': { reason: unknown }

  // Crash recovery
  'crash:renderer': { windowId: number; reason: string; exitCode: number }
  'crash:recovered': { windowId: number; attempt: number }
  'crash:unrecoverable': { windowId: number }
}

type Listener<T> = (payload: T) => void

export class MainEventBus {
  private readonly listeners = new Map<keyof MainEvents, Set<Listener<unknown>>>()

  on<K extends keyof MainEvents>(event: K, listener: Listener<MainEvents[K]>): () => void {
    let bucket = this.listeners.get(event)
    if (!bucket) {
      bucket = new Set()
      this.listeners.set(event, bucket)
    }
    bucket.add(listener as Listener<unknown>)
    return () => this.off(event, listener)
  }

  off<K extends keyof MainEvents>(event: K, listener: Listener<MainEvents[K]>): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>)
  }

  emit<K extends keyof MainEvents>(event: K, payload: MainEvents[K]): void {
    this.listeners.get(event)?.forEach((fn) => fn(payload))
  }

  once<K extends keyof MainEvents>(event: K, listener: Listener<MainEvents[K]>): void {
    const unsub = this.on(event, (payload) => {
      listener(payload)
      unsub()
    })
  }
}
