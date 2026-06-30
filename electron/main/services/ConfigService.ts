import fs from 'fs'
import path from 'path'

import type { AppConfigSchema, LogLevel } from '../../shared/config-schema'
import { DEFAULT_CONFIG } from '../../shared/config-schema'
import type { MainEventBus } from '../core/events/MainEventBus'
import type { Logger } from '../core/logger/Logger'

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }

export class ConfigService {
  private config: AppConfigSchema = structuredClone(DEFAULT_CONFIG)
  private readonly filePath: string

  constructor(
    userDataPath: string,
    private readonly eventBus: MainEventBus,
    private readonly logger: Logger,
  ) {
    this.filePath = path.join(userDataPath, 'config.json')
    this.load()
  }

  // ---------------------------------------------------------------------------
  // Public API

  get<K extends keyof AppConfigSchema>(key: K): AppConfigSchema[K] {
    return this.config[key]
  }

  set<K extends keyof AppConfigSchema>(key: K, value: AppConfigSchema[K]): void {
    this.config[key] = value
    this.save()
    this.eventBus.emit('config:changed', { key, value })
    this.logger.debug(`config set: ${String(key)}`, value)
  }

  /** Merge a partial update into a nested section */
  patch<K extends keyof AppConfigSchema>(key: K, partial: DeepPartial<AppConfigSchema[K]>): void {
    this.config[key] = { ...this.config[key], ...partial } as AppConfigSchema[K]
    this.save()
    this.eventBus.emit('config:changed', { key, value: this.config[key] })
  }

  reset(): void {
    this.config = structuredClone(DEFAULT_CONFIG)
    this.save()
    this.eventBus.emit('config:reset', undefined)
    this.logger.info('config reset to defaults')
  }

  getAll(): Readonly<AppConfigSchema> {
    return this.config
  }

  getLogLevel(): LogLevel {
    return this.config.logging.level
  }

  // ---------------------------------------------------------------------------
  // Persistence

  private load(): void {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.logger.info('No config file found — using defaults')
        return
      }
      const raw = fs.readFileSync(this.filePath, 'utf8')
      const parsed = JSON.parse(raw) as DeepPartial<AppConfigSchema>
      this.config = this.merge(DEFAULT_CONFIG, parsed)
      this.logger.info('Config loaded', { path: this.filePath })
    } catch (err) {
      this.logger.error('Failed to load config — using defaults', err)
    }
  }

  private save(): void {
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
      fs.writeFileSync(this.filePath, JSON.stringify(this.config, null, 2), 'utf8')
    } catch (err) {
      this.logger.error('Failed to save config', err)
    }
  }

  /** Deep merge: default values are filled in for any keys missing from saved config */
  private merge<T extends object>(defaults: T, saved: DeepPartial<T>): T {
    const result = structuredClone(defaults)
    for (const key of Object.keys(defaults) as (keyof T)[]) {
      const savedVal = saved[key]
      if (savedVal === undefined) continue
      if (
        typeof savedVal === 'object' &&
        savedVal !== null &&
        !Array.isArray(savedVal) &&
        typeof defaults[key] === 'object' &&
        defaults[key] !== null
      ) {
        result[key] = this.merge(defaults[key] as object, savedVal as DeepPartial<object>) as T[keyof T]
      } else {
        result[key] = savedVal as T[keyof T]
      }
    }
    return result
  }
}
