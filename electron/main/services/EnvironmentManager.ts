import { app } from 'electron'
import path from 'path'

export type AppEnvironment = 'development' | 'production'

export class EnvironmentManager {
  readonly isDev: boolean
  readonly isProd: boolean
  readonly environment: AppEnvironment
  readonly platform: NodeJS.Platform
  readonly arch: string

  /** URL of the Vite dev server — only set in development */
  readonly devServerUrl: string | null

  constructor() {
    this.devServerUrl = process.env['VITE_DEV_SERVER_URL'] ?? null
    this.isDev = this.devServerUrl !== null || process.env['NODE_ENV'] === 'development'
    this.isProd = !this.isDev
    this.environment = this.isDev ? 'development' : 'production'
    this.platform = process.platform
    this.arch = process.arch
  }

  /** Absolute path to the renderer's index.html (production only) */
  getRendererPath(): string {
    return path.join(__dirname, '../../../dist/index.html')
  }

  /** Absolute path to the compiled preload script */
  getPreloadPath(): string {
    return path.join(__dirname, '../preload/index.js')
  }

  /** User-data directory (config, logs) — only valid after app ready */
  getUserDataPath(): string {
    return app.getPath('userData')
  }

  /** Log directory — only valid after app ready */
  getLogPath(): string {
    return app.getPath('logs')
  }

  /** Origin(s) considered trusted for IPC sender validation */
  getTrustedOrigins(): string[] {
    if (this.isDev && this.devServerUrl) {
      return [this.devServerUrl]
    }
    return ['file://']
  }
}
